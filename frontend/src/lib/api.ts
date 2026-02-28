import {
  QuestionsResponse,
  QuestionDetailResponse,
  CreateQuestionResponse,
  Answer,
  VoteResponse,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new Error(error.error?.message || 'Request failed');
  }

  return res.json();
}

export async function getQuestions(page = 1, limit = 20): Promise<QuestionsResponse> {
  return fetchApi<QuestionsResponse>(`/api/questions?page=${page}&limit=${limit}`);
}

export async function getQuestion(id: string): Promise<QuestionDetailResponse> {
  return fetchApi<QuestionDetailResponse>(`/api/questions/${id}`);
}

export async function createQuestion(
  title: string,
  content: string,
  authorName?: string,
  tags?: string[]
): Promise<CreateQuestionResponse> {
  return fetchApi<CreateQuestionResponse>('/api/questions', {
    method: 'POST',
    body: JSON.stringify({ title, content, authorName, tags }),
  });
}

export async function createAnswer(
  questionId: string,
  content: string,
  authorName?: string
): Promise<{ answer: Answer }> {
  return fetchApi<{ answer: Answer }>('/api/answers', {
    method: 'POST',
    body: JSON.stringify({ questionId, content, authorName }),
  });
}

export async function vote(answerId: string, voteType: 'upvote' | 'downvote'): Promise<VoteResponse> {
  return fetchApi<VoteResponse>('/api/votes', {
    method: 'POST',
    body: JSON.stringify({ answerId, voteType }),
  });
}

// Debug API functions (DELETE LATER)
export interface DebugConversation {
  id: string;
  title: string;
  specialty: string;
  sub_specialty: string | null;
  scenario_type: string;
  conditions: string[];
  guidelines_referenced: string[];
  complexity: string;
  source_type: string;
  created_at: string;
  message_count: number;
}

export interface DebugMessage {
  id: string;
  role: string;
  content: string;
  message_order: number;
  has_embedding: boolean;
  professional_name: string;
  professional_credentials: string;
  professional_specialty: string;
  professional_institution: string;
}

export interface DebugStats {
  conversations_count: string;
  messages_count: string;
  messages_with_embeddings: string;
  professionals_count: string;
  specialties: string[];
}

export async function getDebugConversations(): Promise<{ conversations: DebugConversation[] }> {
  return fetchApi<{ conversations: DebugConversation[] }>('/api/debug/conversations');
}

export async function getDebugConversation(id: string): Promise<{
  conversation: DebugConversation;
  messages: DebugMessage[];
}> {
  return fetchApi('/api/debug/conversations/' + id);
}

export async function getDebugStats(): Promise<DebugStats> {
  return fetchApi<DebugStats>('/api/debug/stats');
}
