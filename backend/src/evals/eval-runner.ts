import { spawn } from 'child_process';
import path from 'path';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import type { Run, Example } from 'langsmith/schemas';
import { EVAL_QUESTIONS, EvalQuestion } from './dataset';
import { runHealthProPipeline, PipelineResult } from './healthpro-pipeline';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function getArg(flag: string, fallback: string): string {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const PROMPT_VERSION = getArg('--version', 'v1');
const KB_SNAPSHOT = getArg('--kb', 'unknown');
const LANGSMITH_DATASET_NAME = 'healthpro-eval-v1';

// ---------------------------------------------------------------------------
// RAGAS subprocess scorer
// ---------------------------------------------------------------------------

interface RagasScore {
  id: string;
  faithfulness: number | null;
  answer_relevance: number | null;
  context_precision: number | null;
  context_recall: number | null;
}

async function runRagasScorer(results: PipelineResult[]): Promise<RagasScore[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'ragas_scorer.py');
    const pythonBin = process.env.PYTHON_BIN ?? 'python3';
    const python = spawn(pythonBin, [scriptPath], { env: process.env });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    python.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ragas_scorer.py exited with code ${code}:\n${stderr}`));
        return;
      }
      try {
        const scores = JSON.parse(stdout) as RagasScore[];
        resolve(scores);
      } catch (e) {
        reject(new Error(`Failed to parse ragas_scorer.py output: ${stdout}`));
      }
    });

    python.stdin.write(JSON.stringify(results));
    python.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// LangSmith dataset management (idempotent)
// ---------------------------------------------------------------------------

async function ensureDataset(client: Client, questions: EvalQuestion[]): Promise<string> {
  try {
    const existing = await client.readDataset({ datasetName: LANGSMITH_DATASET_NAME });
    console.log(`[LangSmith] Dataset "${LANGSMITH_DATASET_NAME}" already exists (id: ${existing.id})`);
    return existing.id;
  } catch {
    console.log(`[LangSmith] Creating dataset "${LANGSMITH_DATASET_NAME}"...`);
    const dataset = await client.createDataset(LANGSMITH_DATASET_NAME, {
      description: 'HealthPro RAG evaluation set — 30 in-scope + 15 out-of-scope + 5 adversarial',
    });

    await client.createExamples({
      inputs: questions.map((q) => ({ question: q.question, id: q.id })),
      outputs: questions.map((q) => ({
        answer: q.ground_truth,
        should_fallback: q.should_fallback,
        category: q.category,
      })),
      datasetId: dataset.id,
    });

    console.log(`[LangSmith] Uploaded ${questions.length} examples`);
    return dataset.id;
  }
}

// ---------------------------------------------------------------------------
// Summary helpers
// ---------------------------------------------------------------------------

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function fmt(v: number | null, n = 2): string {
  return v === null ? 'n/a' : v.toFixed(n);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const runDate = new Date().toISOString();
  const client = new Client();

  // Filter out placeholder questions with empty text
  const questions = EVAL_QUESTIONS.filter((q) => q.question.trim() !== '');
  const skipped = EVAL_QUESTIONS.length - questions.length;

  console.log('='.repeat(60));
  console.log(`HEALTHPRO EVAL RUNNER`);
  console.log(`Prompt version : ${PROMPT_VERSION}`);
  console.log(`KB snapshot    : ${KB_SNAPSHOT}`);
  console.log(`Questions      : ${questions.length} of ${EVAL_QUESTIONS.length} (${skipped} skipped — empty)`);
  console.log('='.repeat(60));

  // Ensure LangSmith dataset exists
  await ensureDataset(client, questions);

  // Run all questions through the HealthPro pipeline
  console.log('\n[Pipeline] Running all questions...');
  const pipelineResults: PipelineResult[] = [];
  for (const q of questions) {
    process.stdout.write(`  ${q.id} (${q.specialty ?? q.category})... `);
    try {
      const result = await runHealthProPipeline(q);
      pipelineResults.push(result);
      console.log(result.is_fallback ? 'FALLBACK' : 'answered');
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`);
      pipelineResults.push({
        id: q.id,
        question: q.question,
        answer: 'FALLBACK',
        contexts: [],
        ground_truth: q.ground_truth,
        should_fallback: q.should_fallback,
        is_fallback: true,
      });
    }
  }

  // Batch RAGAS scoring via Python subprocess
  console.log('\n[RAGAS] Scoring matched responses...');
  let ragasScores: RagasScore[] = pipelineResults.map((r) => ({
    id: r.id,
    faithfulness: null,
    answer_relevance: null,
    context_precision: null,
    context_recall: null,
  }));

  const matchedCount = pipelineResults.filter((r) => r.answer !== 'FALLBACK').length;
  if (matchedCount > 0) {
    try {
      ragasScores = await runRagasScorer(pipelineResults);
      console.log(`[RAGAS] Scored ${matchedCount} matched responses`);
    } catch (err) {
      console.error(`[RAGAS] Scoring failed: ${err instanceof Error ? err.message : err}`);
      console.error('[RAGAS] Continuing without RAGAS scores');
    }
  } else {
    console.log('[RAGAS] No matched responses to score');
  }

  // Build lookup maps
  const resultsMap = new Map(pipelineResults.map((r) => [r.question, r]));
  const scoresMap = new Map(ragasScores.map((s) => [s.id, s]));

  // Run LangSmith evaluate() — stores results as an Experiment in the project
  console.log('\n[LangSmith] Running evaluate()...');
  await evaluate(
    (input: Record<string, any>) => {
      const result = resultsMap.get(input['question'] as string);
      return result ?? { answer: 'FALLBACK', contexts: [], is_fallback: true };
    },
    {
      data: LANGSMITH_DATASET_NAME,
      evaluators: [
        (run: Run) => {
          const id = run.inputs?.['id'] as string;
          const score = scoresMap.get(id);
          return { key: 'faithfulness', score: score?.faithfulness ?? null };
        },
        (run: Run) => {
          const id = run.inputs?.['id'] as string;
          const score = scoresMap.get(id);
          return { key: 'answer_relevance', score: score?.answer_relevance ?? null };
        },
        (run: Run) => {
          const id = run.inputs?.['id'] as string;
          const score = scoresMap.get(id);
          return { key: 'context_precision', score: score?.context_precision ?? null };
        },
        (run: Run) => {
          const id = run.inputs?.['id'] as string;
          const score = scoresMap.get(id);
          return { key: 'context_recall', score: score?.context_recall ?? null };
        },
        (run: Run, example?: Example) => {
          const questionText = run.inputs?.['question'] as string;
          const result = resultsMap.get(questionText);
          const shouldFallback = example?.outputs?.['should_fallback'] as boolean;
          if (!shouldFallback) return { key: 'fallback_correct', score: null };
          return {
            key: 'fallback_correct',
            score: result?.is_fallback ? 1 : 0,
          };
        },
      ],
      experimentPrefix: 'healthpro',
      metadata: {
        prompt_version: PROMPT_VERSION,
        kb_snapshot: KB_SNAPSHOT,
        run_date: runDate,
      },
    }
  );

  // ---------------------------------------------------------------------------
  // Print summary
  // ---------------------------------------------------------------------------

  const faithfulnessScores = ragasScores.map((s) => s.faithfulness);
  const answerRelevanceScores = ragasScores.map((s) => s.answer_relevance);
  const contextPrecisionScores = ragasScores.map((s) => s.context_precision);
  const contextRecallScores = ragasScores.map((s) => s.context_recall);

  const gtCount = ragasScores.filter((s) => s.context_precision !== null).length;

  // Fallback accuracy
  const fallbackQuestions = pipelineResults.filter((r) => r.should_fallback);
  const fallbackCorrect = fallbackQuestions.filter((r) => r.is_fallback).length;

  // Failed questions (faithfulness < 0.5 or fallback_correct=0)
  const failed: string[] = [];
  for (const r of pipelineResults) {
    const score = scoresMap.get(r.id);
    if (score?.faithfulness !== null && score!.faithfulness! < 0.5) {
      failed.push(`  ${r.id} — faithfulness ${fmt(score!.faithfulness)}`);
    }
    if (r.should_fallback && !r.is_fallback) {
      failed.push(`  ${r.id} — fallback_correct=0 (answered when should have fallen back)`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Prompt version   : ${PROMPT_VERSION}`);
  console.log(`KB snapshot      : ${KB_SNAPSHOT}`);
  console.log(`Questions run    : ${questions.length} (of ${EVAL_QUESTIONS.length} — ${skipped} skipped: empty question text)`);
  console.log('');
  console.log(`Matched responses scored : ${matchedCount}`);
  console.log(`Faithfulness avg         : ${fmt(avg(faithfulnessScores))}`);
  console.log(`Answer relevance avg     : ${fmt(avg(answerRelevanceScores))}`);
  console.log(`Context precision avg    : ${fmt(avg(contextPrecisionScores))} (${gtCount} questions with ground truth)`);
  console.log(`Context recall avg       : ${fmt(avg(contextRecallScores))} (${gtCount} questions with ground truth)`);
  console.log('');
  console.log(`Fallback accuracy        : ${fallbackCorrect}/${fallbackQuestions.length} correct`);

  if (failed.length > 0) {
    console.log('\nFailed questions:');
    failed.forEach((f) => console.log(f));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
