import OpenAI from 'openai';
import { config } from '../config/env';
import { queryOne } from '../config/database';
import { storeConversation } from './generateKnowledgeBase';
import { GeneratedConversation, GeneratedMessage } from './conversationGenerator';

const openai = new OpenAI({ apiKey: config.openaiApiKey });
const NCBI_API_KEY = process.env.NCBI_API_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');
const PUBMED_DELAY_MS = 500;

// ---------------------------------------------------------------------------
// Specialty configuration
// ---------------------------------------------------------------------------

interface SpecialtyConfig {
  name: string;
  meshTerm: string;
  target: number;
  specialistCredentials: string;
}

const SPECIALTIES: SpecialtyConfig[] = [
  { name: 'Cardiology',         meshTerm: '"Heart Diseases"[MeSH]',             target: 5, specialistCredentials: 'MD, FACC' },
  { name: 'Internal Medicine',  meshTerm: '"Internal Medicine"[MeSH]',          target: 5, specialistCredentials: 'MD, FACP' },
  { name: 'Pulmonology',        meshTerm: '"Lung Diseases"[MeSH]',              target: 5, specialistCredentials: 'MD, FCCP' },
  { name: 'Endocrinology',      meshTerm: '"Diabetes Mellitus, Type 2"[MeSH]',  target: 5, specialistCredentials: 'MD, FACE' },
  { name: 'Neurology',          meshTerm: '"Nervous System Diseases"[MeSH]',    target: 5, specialistCredentials: 'MD, FAAN' },
  { name: 'Infectious Disease', meshTerm: '"Communicable Diseases"[MeSH]',      target: 5, specialistCredentials: 'MD, FIDSA' },
  { name: 'Nephrology',         meshTerm: '"Kidney Diseases"[MeSH]',            target: 5, specialistCredentials: 'MD, FASN' },
  { name: 'Hematology',         meshTerm: '"Hematologic Diseases"[MeSH]',       target: 5, specialistCredentials: 'MD, FACP' },
];

// ---------------------------------------------------------------------------
// PubMed helpers
// ---------------------------------------------------------------------------

function buildNcbiParams(extra: Record<string, string>): string {
  const params: Record<string, string> = { ...extra };
  if (NCBI_API_KEY) params['api_key'] = NCBI_API_KEY;
  return new URLSearchParams(params).toString();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPubMedIds(meshTerm: string): Promise<string[]> {
  const term = `${meshTerm} AND "case reports"[Publication Type]`;
  const qs = buildNcbiParams({ db: 'pubmed', term, retmax: '10', retmode: 'json', sort: 'relevance' });
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${qs}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESearch failed: ${res.status}`);
  const json = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return json.esearchresult?.idlist ?? [];
}

async function fetchAbstract(pmid: string): Promise<string> {
  const qs = buildNcbiParams({ db: 'pubmed', id: pmid, rettype: 'abstract', retmode: 'text' });
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${qs}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`EFetch failed for PMID ${pmid}: ${res.status}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Abstract validation
// ---------------------------------------------------------------------------

const MANAGEMENT_TERMS = [
  'treatment', 'management', 'therapy', 'administered', 'prescribed',
  'dose', 'dosage', 'medication', 'drug', 'surgery', 'procedure',
  'intervention', 'treated', 'initiated', 'started',
];

function validateAbstract(text: string, pmid: string): { valid: boolean; reason?: string } {
  const words = text.trim().split(/\s+/).length;
  if (words < 150) return { valid: false, reason: `abstract too short: ${words} words` };

  const lower = text.toLowerCase();
  const hasClinical = MANAGEMENT_TERMS.some((t) => lower.includes(t));
  if (!hasClinical) return { valid: false, reason: 'no clinical management content detected' };

  return { valid: true };
}

// ---------------------------------------------------------------------------
// GPT-4 Turbo conversation generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are generating synthetic doctor-to-doctor consultation conversations for a medical knowledge base. Each conversation must be realistic, clinically accurate, and formatted exactly as specified.

You will be given a PubMed case report abstract. Convert it into a consultation conversation between two physicians: a consulting physician (the one seeking advice) and a specialist (the one providing it).

CONVERSATION REQUIREMENTS:
- 6 to 10 messages total, alternating between the two physicians
- The consulting physician opens with a clinical question or case description based on the abstract
- The specialist responds with management guidance drawn from the abstract's findings and outcomes
- Each message should be 2–5 sentences — realistic consultation length, not a lecture
- Tone: collegial, direct, peer-to-peer — not formal documentation style
- Clinical details must come from the abstract — do not add invented details not present in the source material
- The conversation must resolve with a clear management recommendation or clinical conclusion

ATTRIBUTION REQUIREMENTS:
Assign realistic but entirely fictional physician identities.
For each conversation generate:

Consulting physician:
  - name: realistic full name (e.g., "Dr. James Patel")
  - role: "consulting_physician"
  - specialty: the referring specialty (e.g., "Internal Medicine")
  - credentials: "MD"
  - institution: a fictional but plausible US hospital name

Specialist:
  - name: realistic full name (e.g., "Dr. Sarah Chen")
  - role: "specialist"
  - specialty: the relevant specialist specialty for this case
  - credentials: appropriate credential string (e.g., "MD, FACC" for cardiology, "MD, FCCP" for pulmonology)
  - institution: a fictional but plausible US hospital name

OUTPUT FORMAT:
Return a single valid JSON object with this exact structure — no preamble, no markdown, no explanation, JSON only:

{
  "specialty": "<specialist specialty>",
  "topic": "<2–5 word clinical topic label>",
  "source_pmid": "<PMID passed in>",
  "participants": {
    "consulting_physician": {
      "name": "<full name>",
      "role": "consulting_physician",
      "specialty": "<specialty>",
      "credentials": "<credentials>",
      "institution": "<institution>"
    },
    "specialist": {
      "name": "<full name>",
      "role": "specialist",
      "specialty": "<specialty>",
      "credentials": "<credentials>",
      "institution": "<institution>"
    }
  },
  "messages": [
    {
      "role": "consulting_physician",
      "content": "<message text>",
      "message_order": 1
    },
    {
      "role": "specialist",
      "content": "<message text>",
      "message_order": 2
    }
  ]
}`;

interface GptParticipant {
  name: string;
  role: string;
  specialty: string;
  credentials: string;
  institution: string;
}

interface GptMessage {
  role: string;
  content: string;
  message_order: number;
}

interface GptConversation {
  specialty: string;
  topic: string;
  source_pmid: string;
  participants: {
    consulting_physician: GptParticipant;
    specialist: GptParticipant;
  };
  messages: GptMessage[];
}

async function generateConversationFromAbstract(
  pmid: string,
  specialty: string,
  abstractText: string
): Promise<GptConversation> {
  const userMessage = `Source PMID: ${pmid}
Specialty: ${specialty}

Abstract:
${abstractText}

Convert this into a physician consultation conversation following the format and requirements in your instructions.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  return JSON.parse(content) as GptConversation;
}

// ---------------------------------------------------------------------------
// GPT output validation
// ---------------------------------------------------------------------------

function validateGptOutput(parsed: GptConversation, pmid: string): { valid: boolean; reason?: string } {
  if (!parsed.specialty) return { valid: false, reason: 'missing specialty' };
  if (!parsed.topic) return { valid: false, reason: 'missing topic' };
  if (!Array.isArray(parsed.messages)) return { valid: false, reason: 'messages is not an array' };

  const len = parsed.messages.length;
  if (len < 6 || len > 10) return { valid: false, reason: `messages length=${len} (expected 6–10)` };

  // Check alternating roles
  for (let i = 0; i < parsed.messages.length; i++) {
    const expected = i % 2 === 0 ? 'consulting_physician' : 'specialist';
    if (parsed.messages[i].role !== expected) {
      return { valid: false, reason: `message ${i + 1} has role '${parsed.messages[i].role}', expected '${expected}'` };
    }
  }

  // Check message fields
  for (const msg of parsed.messages) {
    if (!msg.content || msg.content.trim() === '') return { valid: false, reason: 'empty message content' };
    if (!Number.isInteger(msg.message_order)) return { valid: false, reason: 'message_order is not an integer' };
  }

  // Check participants
  const { consulting_physician, specialist } = parsed.participants ?? {};
  for (const [label, p] of [['consulting_physician', consulting_physician], ['specialist', specialist]] as const) {
    if (!p) return { valid: false, reason: `missing participant: ${label}` };
    for (const field of ['name', 'role', 'specialty', 'credentials', 'institution'] as const) {
      if (!p[field]) return { valid: false, reason: `participant ${label} missing ${field}` };
    }
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Format adapter: GptConversation → GeneratedConversation
// ---------------------------------------------------------------------------

function toGeneratedConversation(gpt: GptConversation, pmid: string): GeneratedConversation {
  const cp = gpt.participants.consulting_physician;
  const sp = gpt.participants.specialist;

  const messages: GeneratedMessage[] = gpt.messages.map((msg) => {
    const participant = msg.role === 'consulting_physician' ? cp : sp;
    return {
      role: msg.role === 'consulting_physician' ? 'Consulting Physician' : participant.specialty,
      expertName: participant.name,
      credentials: participant.credentials,
      specialty: participant.specialty,
      subSpecialty: undefined,
      institution: participant.institution,
      content: msg.content,
      messageOrder: msg.message_order,
    };
  });

  return {
    title: gpt.topic,
    specialty: sp.specialty,
    subSpecialty: undefined,
    scenarioType: 'consultation',
    patientDemographics: {},
    conditions: [],
    medicationsDiscussed: [],
    guidelinesReferenced: [],
    keyTopics: [gpt.topic, `PMID:${pmid}`],
    complexity: 'intermediate',
    messages,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface SpecialtyStats {
  inserted: number;
  skipped: number;
}

async function processSpecialty(spec: SpecialtyConfig): Promise<SpecialtyStats> {
  const stats: SpecialtyStats = { inserted: 0, skipped: 0 };
  const tag = `[${spec.name}]`;

  let pmids: string[];
  try {
    pmids = await fetchPubMedIds(spec.meshTerm);
    await sleep(PUBMED_DELAY_MS);
  } catch (err) {
    console.error(`${tag} Failed to fetch PMIDs:`, err instanceof Error ? err.message : err);
    return stats;
  }

  if (pmids.length === 0) {
    console.log(`${tag} No PMIDs returned for "${spec.meshTerm}"`);
    return stats;
  }

  for (const pmid of pmids) {
    if (stats.inserted >= spec.target) break;

    // Fetch abstract
    let abstractText: string;
    try {
      abstractText = await fetchAbstract(pmid);
      await sleep(PUBMED_DELAY_MS);
    } catch (err) {
      console.log(`${tag} PMID ${pmid} → skipped (fetch error: ${err instanceof Error ? err.message : err})`);
      stats.skipped++;
      continue;
    }

    // Validate abstract
    const absCheck = validateAbstract(abstractText, pmid);
    if (!absCheck.valid) {
      console.log(`${tag} PMID ${pmid} → skipped (${absCheck.reason})`);
      stats.skipped++;
      continue;
    }
    console.log(`${tag} PMID ${pmid} → fetched`);

    // Generate conversation
    let gptOutput: GptConversation;
    try {
      gptOutput = await generateConversationFromAbstract(pmid, spec.name, abstractText);
    } catch (err) {
      console.log(`${tag} PMID ${pmid} → skipped (GPT error: ${err instanceof Error ? err.message : err})`);
      stats.skipped++;
      continue;
    }
    console.log(`${tag} PMID ${pmid} → generated`);

    // Validate GPT output
    const gptCheck = validateGptOutput(gptOutput, pmid);
    if (!gptCheck.valid) {
      console.log(`${tag} PMID ${pmid} → skipped (GPT JSON invalid: ${gptCheck.reason})`);
      stats.skipped++;
      continue;
    }

    const conversation = toGeneratedConversation(gptOutput, pmid);

    if (DRY_RUN) {
      console.log(`${tag} PMID ${pmid} → [DRY RUN] would insert:`);
      console.log(JSON.stringify(gptOutput, null, 2));
    } else {
      try {
        await storeConversation(conversation);
        console.log(`${tag} PMID ${pmid} → inserted`);
      } catch (err) {
        console.log(`${tag} PMID ${pmid} → skipped (insert error: ${err instanceof Error ? err.message : err})`);
        stats.skipped++;
        continue;
      }
    }

    stats.inserted++;
  }

  return stats;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('KB EXPANSION SCRIPT' + (DRY_RUN ? ' [DRY RUN]' : ''));
  console.log('='.repeat(60));

  const allStats = new Map<string, SpecialtyStats>();
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const spec of SPECIALTIES) {
    console.log(`\n${'─'.repeat(40)}`);
    console.log(`Specialty: ${spec.name}`);
    console.log(`${'─'.repeat(40)}`);

    const stats = await processSpecialty(spec);
    allStats.set(spec.name, stats);
    totalInserted += stats.inserted;
    totalSkipped += stats.skipped;
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  for (const spec of SPECIALTIES) {
    const s = allStats.get(spec.name)!;
    console.log(`  ${spec.name.padEnd(20)}: ${s.inserted} inserted, ${s.skipped} skipped`);
  }

  console.log(`\n  Total inserted : ${totalInserted}`);
  console.log(`  Total skipped  : ${totalSkipped}`);

  if (!DRY_RUN) {
    const dbStats = await queryOne<{ convs: string; msgs: string; profs: string }>(`
      SELECT
        (SELECT COUNT(*) FROM conversations) as convs,
        (SELECT COUNT(*) FROM conversation_messages) as msgs,
        (SELECT COUNT(*) FROM professionals) as profs
    `);

    if (dbStats) {
      console.log(`\nDB Stats:`);
      console.log(`  Conversations : ${dbStats.convs}`);
      console.log(`  Messages      : ${dbStats.msgs}`);
      console.log(`  Professionals : ${dbStats.profs}`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
