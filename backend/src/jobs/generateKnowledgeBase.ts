import { query, queryOne } from '../config/database';
import { generateEmbedding, formatEmbeddingForPgVector } from '../services/embeddingService';
import { SCENARIOS } from './scenarios';
import { generateConversation, GeneratedConversation, GeneratedMessage } from './conversationGenerator';

interface Professional {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  sub_specialty: string | null;
  institution: string;
}

// Cache for professionals to avoid duplicates
const professionalCache = new Map<string, string>();

async function getOrCreateProfessional(message: GeneratedMessage): Promise<string> {
  const cacheKey = `${message.expertName}-${message.specialty}-${message.institution}`;

  if (professionalCache.has(cacheKey)) {
    return professionalCache.get(cacheKey)!;
  }

  // Check if exists in DB
  const existing = await queryOne<Professional>(
    `SELECT id FROM professionals WHERE name = $1 AND specialty = $2 AND institution = $3`,
    [message.expertName, message.specialty, message.institution]
  );

  if (existing) {
    professionalCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // Create new professional
  const created = await queryOne<Professional>(
    `INSERT INTO professionals (name, credentials, specialty, sub_specialty, institution, is_verified)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING id`,
    [message.expertName, message.credentials, message.specialty, message.subSpecialty || null, message.institution]
  );

  if (!created) {
    throw new Error('Failed to create professional');
  }

  professionalCache.set(cacheKey, created.id);
  return created.id;
}

async function storeConversation(conversation: GeneratedConversation): Promise<void> {
  console.log(`  Storing conversation: ${conversation.title}`);

  // Create conversation record
  const conv = await queryOne<{ id: string }>(
    `INSERT INTO conversations (
      title, specialty, sub_specialty, scenario_type, patient_demographics,
      conditions, medications_discussed, guidelines_referenced, key_topics,
      complexity, source_type, validation_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'synthetic', 'pending')
    RETURNING id`,
    [
      conversation.title,
      conversation.specialty,
      conversation.subSpecialty || null,
      conversation.scenarioType,
      JSON.stringify(conversation.patientDemographics),
      conversation.conditions,
      conversation.medicationsDiscussed,
      conversation.guidelinesReferenced,
      conversation.keyTopics,
      conversation.complexity,
    ]
  );

  if (!conv) {
    throw new Error('Failed to create conversation');
  }

  // Store each message with embedding
  for (const message of conversation.messages) {
    const professionalId = await getOrCreateProfessional(message);

    // Generate embedding for message content
    console.log(`    Generating embedding for message ${message.messageOrder}...`);
    const embedding = await generateEmbedding(message.content);
    const embeddingStr = formatEmbeddingForPgVector(embedding);

    await query(
      `INSERT INTO conversation_messages (
        conversation_id, professional_id, role, content, embedding, message_order
      ) VALUES ($1, $2, $3, $4, $5::vector, $6)`,
      [conv.id, professionalId, message.role, message.content, embeddingStr, message.messageOrder]
    );
  }

  console.log(`  ✓ Stored ${conversation.messages.length} messages`);
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('KNOWLEDGE BASE GENERATOR');
  console.log('='.repeat(60));
  console.log(`\nGenerating synthetic conversations for ${SCENARIOS.length} scenarios...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    console.log(`\n[${i + 1}/${SCENARIOS.length}] ${scenario.specialty}: ${scenario.title}`);

    try {
      // Generate conversation using LLM
      console.log('  Generating conversation with LLM...');
      const conversation = await generateConversation(scenario);

      // Store in database
      await storeConversation(conversation);

      successCount++;
      console.log(`  ✓ Complete`);
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error:`, error instanceof Error ? error.message : error);
    }

    // Rate limiting - wait between API calls
    if (i < SCENARIOS.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Errors: ${errorCount}`);
  console.log(`Total scenarios: ${SCENARIOS.length}`);

  // Print stats
  const stats = await queryOne<{ convs: string; msgs: string; profs: string }>(`
    SELECT
      (SELECT COUNT(*) FROM conversations) as convs,
      (SELECT COUNT(*) FROM conversation_messages) as msgs,
      (SELECT COUNT(*) FROM professionals) as profs
  `);

  if (stats) {
    console.log(`\nDatabase Stats:`);
    console.log(`  Conversations: ${stats.convs}`);
    console.log(`  Messages: ${stats.msgs}`);
    console.log(`  Professionals: ${stats.profs}`);
  }

  process.exit(errorCount > 0 ? 1 : 0);
}

// Run if called directly
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
