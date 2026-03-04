-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- KNOWLEDGE BASE TABLES (Internal - for RAG)
-- ============================================

-- Professionals table for expert attribution
CREATE TABLE professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  credentials VARCHAR(100),
  specialty VARCHAR(100),
  sub_specialty VARCHAR(100),
  institution VARCHAR(255),
  years_experience INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations (synthetic or expert-provided)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  specialty VARCHAR(100),
  sub_specialty VARCHAR(100),
  scenario_type VARCHAR(50),
  patient_demographics JSONB,
  conditions TEXT[],
  medications_discussed TEXT[],
  guidelines_referenced TEXT[],
  key_topics TEXT[],
  complexity VARCHAR(20),
  source_type VARCHAR(50) NOT NULL,  -- 'synthetic' | 'expert'
  validation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual messages within conversations (embedded for RAG)
CREATE TABLE conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id),
  role VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  message_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for knowledge base
CREATE INDEX ON conversation_messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_conv_messages_conv_id ON conversation_messages(conversation_id);
CREATE INDEX idx_conversations_specialty ON conversations(specialty);
CREATE INDEX idx_professionals_specialty ON professionals(specialty);

-- ============================================
-- USER-FACING TABLES
-- ============================================

-- Users (for login/auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- Questions from users
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  author_name VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON questions USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_questions_user_id ON questions(user_id);

-- Answers (AI-generated using RAG from knowledge base, or human answers)
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  author_name VARCHAR(255),
  content TEXT NOT NULL,
  embedding vector(1536),
  is_ai_generated BOOLEAN DEFAULT FALSE,
  ai_source VARCHAR(50),                -- 'openai' | 'anthropic' | 'openai+anthropic'
  attribution_type VARCHAR(50),         -- 'expert' | 'ai_only' | 'human'
  source_message_ids UUID[],            -- References conversation_messages used for RAG
  expert_ids UUID[],                    -- References professionals for expert attribution
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for answers
CREATE INDEX ON answers USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_user_id ON answers(user_id);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES answers(id) ON DELETE CASCADE,
  voter_ip VARCHAR(45),
  vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(voter_ip, answer_id)
);

CREATE INDEX idx_votes_answer_id ON votes(answer_id);
