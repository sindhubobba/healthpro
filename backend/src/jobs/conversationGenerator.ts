import OpenAI from 'openai';
import { Scenario, getRandomExpert } from './scenarios';
import { config } from '../config/env';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export interface GeneratedMessage {
  role: string;
  expertName: string;
  credentials: string;
  specialty: string;
  subSpecialty?: string;
  institution: string;
  content: string;
  messageOrder: number;
}

export interface GeneratedConversation {
  title: string;
  specialty: string;
  subSpecialty?: string;
  scenarioType: string;
  patientDemographics: Record<string, any>;
  conditions: string[];
  medicationsDiscussed: string[];
  guidelinesReferenced: string[];
  keyTopics: string[];
  complexity: string;
  messages: GeneratedMessage[];
}

function buildConversationPrompt(scenario: Scenario): string {
  const participantDescriptions = scenario.participants
    .map((p, i) => `Participant ${i + 1}: ${p.role} (${p.specialty}${p.subSpecialty ? ` - ${p.subSpecialty}` : ''})`)
    .join('\n');

  return `Generate a realistic medical consultation conversation between physicians.

SCENARIO:
Title: ${scenario.title}
Specialty: ${scenario.specialty}${scenario.subSpecialty ? ` (${scenario.subSpecialty})` : ''}
Type: ${scenario.scenarioType}
Complexity: ${scenario.complexity}

PATIENT:
Age range: ${scenario.patientDemographics.ageRange}
${scenario.patientDemographics.sex ? `Sex: ${scenario.patientDemographics.sex}` : ''}
${scenario.patientDemographics.relevantHistory ? `Relevant history: ${scenario.patientDemographics.relevantHistory.join(', ')}` : ''}

PARTICIPANTS:
${participantDescriptions}

KEY TOPICS TO COVER:
${scenario.keyTopics.join(', ')}

GUIDELINES TO REFERENCE:
${scenario.guidelinesReferenced.join(', ')}

CONDITIONS:
${scenario.conditions.join(', ')}

INSTRUCTIONS:
1. Generate a realistic back-and-forth conversation (6-10 exchanges total)
2. The first participant presents the case and asks for guidance
3. The specialist provides evidence-based recommendations
4. Include specific medication names, dosages, and protocols where relevant
5. Reference the guidelines mentioned
6. Use professional medical terminology
7. Be clinically accurate and practical

FORMAT YOUR RESPONSE AS JSON:
{
  "messages": [
    {
      "participant": 1 or 2,
      "content": "The message content..."
    }
  ],
  "medicationsDiscussed": ["medication1", "medication2"]
}

Generate the conversation now:`;
}

interface LLMResponse {
  messages: { participant: number; content: string }[];
  medicationsDiscussed: string[];
}

export async function generateConversation(scenario: Scenario): Promise<GeneratedConversation> {
  const prompt = buildConversationPrompt(scenario);

  // Generate experts for each participant
  const participantExperts = scenario.participants.map((p) => ({
    ...p,
    expert: getRandomExpert(p.subSpecialty || p.specialty),
  }));

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a medical conversation generator. Generate realistic, clinically accurate conversations between healthcare professionals. Always respond with valid JSON only, no markdown or extra text.`,
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';
  let parsed: LLMResponse;

  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse LLM response:', content);
    throw new Error('Failed to generate valid conversation');
  }

  if (!parsed.messages || !Array.isArray(parsed.messages)) {
    throw new Error('Invalid conversation format from LLM');
  }

  // Map LLM messages to our format with expert details
  const messages: GeneratedMessage[] = parsed.messages.map((msg, index) => {
    const participantIndex = (msg.participant || 1) - 1;
    const participant = participantExperts[participantIndex] || participantExperts[0];

    return {
      role: participant.role,
      expertName: participant.expert.name,
      credentials: participant.expert.credentials,
      specialty: participant.specialty,
      subSpecialty: participant.subSpecialty,
      institution: participant.expert.institution,
      content: msg.content,
      messageOrder: index + 1,
    };
  });

  return {
    title: scenario.title,
    specialty: scenario.specialty,
    subSpecialty: scenario.subSpecialty,
    scenarioType: scenario.scenarioType,
    patientDemographics: scenario.patientDemographics,
    conditions: scenario.conditions,
    medicationsDiscussed: parsed.medicationsDiscussed || [],
    guidelinesReferenced: scenario.guidelinesReferenced,
    keyTopics: scenario.keyTopics,
    complexity: scenario.complexity,
    messages,
  };
}
