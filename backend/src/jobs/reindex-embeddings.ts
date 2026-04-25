import { query } from '../config/database';
import { generateEmbedding, formatEmbeddingForPgVector } from '../services/embeddingService';

const BATCH_DELAY_MS = 200;

async function main() {
  const rows = await query<{ id: string; content: string }>(
    `SELECT id, content FROM conversation_messages WHERE embedding IS NOT NULL ORDER BY id`
  );

  console.log(`Re-embedding ${rows.length} conversation_messages...`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const embedding = await generateEmbedding(row.content);
      const embeddingStr = formatEmbeddingForPgVector(embedding);
      await query(
        `UPDATE conversation_messages SET embedding = $1::vector WHERE id = $2`,
        [embeddingStr, row.id]
      );
      success++;
      if (success % 10 === 0) console.log(`  ${success}/${rows.length} done...`);
    } catch (err) {
      failed++;
      console.error(`  ✗ Failed for id=${row.id}: ${err instanceof Error ? err.message : err}`);
    }

    if (i < rows.length - 1) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`\nDone. ${success} re-embedded, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
