"""
RAGAS batch scorer for HealthPro eval pipeline.

Usage:
  echo '[{"question":...}]' | python ragas_scorer.py

stdin:  JSON array of PipelineResult objects
stdout: JSON array of per-item score objects

Score object shape:
  {
    "id": str,
    "faithfulness": float | null,
    "answer_relevance": float | null,
    "context_precision": float | null,
    "context_recall": float | null
  }

Null means the metric was not computed (e.g. no ground_truth for
context_precision/recall, or answer=="FALLBACK").
"""

import sys
import json
import os
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

def build_ragas_dataset(items, include_ground_truth=False):
    data = {
        "question": [item["question"] for item in items],
        "answer": [item["answer"] for item in items],
        "contexts": [item["contexts"] for item in items],
    }
    if include_ground_truth:
        data["ground_truth"] = [item["ground_truth"] for item in items]
    return Dataset.from_dict(data)


def score_batch(items):
    openai_api_key = os.environ.get("OPENAI_API_KEY", "")

    judge_llm = ChatOpenAI(model="gpt-4o", api_key=openai_api_key)
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large", api_key=openai_api_key)

    # Separate items into matched (non-fallback) and fallback
    matched = [item for item in items if item["answer"] != "FALLBACK"]
    matched_with_gt = [item for item in matched if item.get("ground_truth", "")]

    # Initialize result map keyed by id
    scores_by_id = {item["id"]: {
        "id": item["id"],
        "faithfulness": None,
        "answer_relevance": None,
        "context_precision": None,
        "context_recall": None,
    } for item in items}

    # Score faithfulness + answer_relevance on all matched responses
    if matched:
        ds = build_ragas_dataset(matched)
        result = evaluate(
            ds,
            metrics=[faithfulness, answer_relevancy],
            llm=judge_llm,
            embeddings=embeddings,
        )
        result_df = result.to_pandas()
        for i, item in enumerate(matched):
            scores_by_id[item["id"]]["faithfulness"] = float(result_df.iloc[i].get("faithfulness", 0))
            scores_by_id[item["id"]]["answer_relevance"] = float(result_df.iloc[i].get("answer_relevancy", 0))

    # Score context_precision + context_recall only where ground_truth is populated
    if matched_with_gt:
        ds_gt = build_ragas_dataset(matched_with_gt, include_ground_truth=True)
        result_gt = evaluate(
            ds_gt,
            metrics=[context_precision, context_recall],
            llm=judge_llm,
            embeddings=embeddings,
        )
        result_gt_df = result_gt.to_pandas()
        for i, item in enumerate(matched_with_gt):
            scores_by_id[item["id"]]["context_precision"] = float(result_gt_df.iloc[i].get("context_precision", 0))
            scores_by_id[item["id"]]["context_recall"] = float(result_gt_df.iloc[i].get("context_recall", 0))

    return [scores_by_id[item["id"]] for item in items]


if __name__ == "__main__":
    raw = sys.stdin.read()
    try:
        items = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"JSON parse error: {e}"}), file=sys.stderr)
        sys.exit(1)

    try:
        scores = score_batch(items)
        print(json.dumps(scores))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
