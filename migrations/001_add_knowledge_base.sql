-- Migration: Add Knowledge Base Tables
-- Run this on existing database to add new tables

-- ============================================
-- NEW TABLES FOR KNOWLEDGE BASE
-- ============================================

-- Professionals table for expert attribution
CREATE TABLE IF NOT EXISTS professionals (
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
CREATE TABLE IF NOT EXISTS conversations (
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
  source_type VARCHAR(50) NOT NULL,
  validation_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual messages within conversations (embedded for RAG)
CREATE TABLE IF NOT EXISTS conversation_messages (
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
CREATE INDEX IF NOT EXISTS idx_conv_messages_embedding ON conversation_messages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_specialty ON conversations(specialty);
CREATE INDEX IF NOT EXISTS idx_professionals_specialty ON professionals(specialty);

-- ============================================
-- UPDATE EXISTING ANSWERS TABLE
-- ============================================

-- Add new columns to answers table
ALTER TABLE answers ADD COLUMN IF NOT EXISTS attribution_type VARCHAR(50);
ALTER TABLE answers ADD COLUMN IF NOT EXISTS source_message_ids UUID[];
ALTER TABLE answers ADD COLUMN IF NOT EXISTS expert_ids UUID[];

-- Rename source_answer_ids to source_message_ids if it exists (optional cleanup)
-- Note: Run this manually if you have existing data in source_answer_ids
-- ALTER TABLE answers RENAME COLUMN source_answer_ids TO source_message_ids;

-- ============================================
-- VERIFY
-- ============================================
-- Run these queries to verify migration:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- \d professionals
-- \d conversations
-- \d conversation_messages
-- \d answers
