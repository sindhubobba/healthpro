export interface Question {
  id: string;
  user_id?: string | null;
  author_name: string | null;
  title: string;
  content: string;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
  answer_count?: number;
}

export interface Expert {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  institution: string;
}

export interface Answer {
  id: string;
  question_id: string;
  author_name: string | null;
  content: string;
  is_ai_generated: boolean;
  ai_source: string | null;
  attribution_type?: 'expert' | 'ai_only' | 'human' | null;
  source_message_ids?: string[];
  expert_ids?: string[];
  experts?: Expert[];
  upvotes: number;
  downvotes: number;
  created_at: string;
}

export interface SimilarQuestion {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuestionsResponse extends PaginatedResponse<Question> {
  questions: Question[];
}

export interface QuestionDetailResponse {
  question: Question;
  answers: Answer[];
}

export interface CreateQuestionResponse {
  question: Question;
  aiAnswer: Answer;
  usedContext: boolean;
  attributionType: 'expert' | 'ai_only';
  experts: Expert[];
  similarQuestions: SimilarQuestion[];
  knowledgeMatchesCount: number;
}

export interface VoteResponse {
  message: string;
  upvotes: number;
  downvotes: number;
}
