import { query } from '../config/database';
import { generateEmbedding, formatEmbeddingForPgVector } from '../services/embeddingService';

const QUESTION = 'How do you manage anticoagulation for atrial fibrillation in a patient on hemodialysis?';

async function main() {
  console.log(`Query: "${QUESTION}"\n`);
  console.log('Generating embedding...');

  const embedding = await generateEmbedding(QUESTION);
  const embeddingStr = formatEmbeddingForPgVector(embedding);

  console.log('Running cosine similarity search (no threshold, top 10)...\n');

  const results = await query<{
    similarity: number;
    message_order: number;
    conversation_id: string;
    role: string;
    content: string;
    professional_name: string | null;
    specialty: string | null;
    credentials: string | null;
    institution: string | null;
  }>(`
    SELECT
      ROUND((1 - (cm.embedding <=> $1::vector))::numeric, 4) AS similarity,
      cm.message_order,
      cm.conversation_id,
      cm.role,
      cm.content,
      p.name   AS professional_name,
      p.specialty,
      p.credentials,
      p.institution
    FROM conversation_messages cm
    LEFT JOIN professionals p ON cm.professional_id = p.id
    WHERE cm.embedding IS NOT NULL
    ORDER BY cm.embedding <=> $1::vector
    LIMIT 10
  `, [embeddingStr]);

  results.forEach((row, i) => {
    const belowThreshold = row.similarity < 0.60 ? ' ← below 0.60 threshold' : ' ✓ above threshold';
    console.log(`─── #${i + 1}  similarity: ${row.similarity}${belowThreshold}`);
    console.log(`    conversation_id : ${row.conversation_id}`);
    console.log(`    message_order   : ${row.message_order}`);
    console.log(`    role            : ${row.role}`);
    console.log(`    specialist      : ${row.professional_name ?? 'n/a'} (${row.specialty ?? 'n/a'}) ${row.credentials ?? ''}`);
    console.log(`    institution     : ${row.institution ?? 'n/a'}`);
    console.log(`    content         : ${row.content.slice(0, 300).replace(/\n/g, ' ')}${row.content.length > 300 ? '...' : ''}`);
    console.log();
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
