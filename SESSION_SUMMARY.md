# Health Pro Platform - Session Summary
**Date:** 2026-03-04

## Overview
A Q&A platform for health professionals with RAG-powered AI responses using a knowledge base of medical conversations.

## Tech Stack
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL with pgvector
- **LLM Pipeline:** OpenAI (initial) → Anthropic Sonnet 4 (refinement)
- **Frontend:** Next.js + TypeScript

---

## Recent Changes Made

### 1. LLM Service Updates (`backend/src/services/llmService.ts`)

#### Model Update
- Changed Anthropic model from deprecated `claude-3-sonnet-20240229` to `claude-sonnet-4-20250514`

#### Dynamic Prompt Injection
- Added `formatKnowledgeMatches()` - formats RAG matches into context string
- Added `buildSystemPrompt()` - injects `{{RAG_CONTEXT}}` and `{{USER_QUESTION}}` into prompt
- **When RAG context is empty, the entire `<context>` block is removed from the prompt**

#### Timeout Configuration
- Anthropic client timeout set to 120 seconds (2 minutes)

#### LLM Pipeline Flow
```
1. OpenAI called with: RAG_CONTEXT = knowledge matches, USER_QUESTION = posted question
2. Anthropic refinement called with: RAG_CONTEXT = OpenAI response, USER_QUESTION = posted question
3. Fallback: If OpenAI fails, Anthropic called directly with knowledge matches
```

#### Debug Logging Added
```
[LLM] Step 1: Calling OpenAI...
[LLM] OpenAI response received, length: X
[LLM] Step 2: Calling Anthropic for refinement...
[LLM] refineWithAnthropic: System prompt length: X
[LLM] refineWithAnthropic: OpenAI response length: X
[LLM] refineWithAnthropic: Calling Anthropic API...
[LLM] refineWithAnthropic: Anthropic response received
[LLM] Anthropic refinement complete, length: X
```

### 2. Similarity Threshold (`backend/src/config/env.ts`)
- **Current value:** `0.90` (was 0.70, then 0.80)
- Higher threshold reduces false positive RAG matches

### 3. System Prompt Structure
The prompt has rules for:
- **Context available:** Answer ONLY from context, close with expert attribution
- **No context:** Use general knowledge, open with disclaimer
- **Context insufficient:** Inform user and suggest specialist

---

## Key Issues Fixed

### Issue 1: Anthropic Model Deprecated
- **Error:** `404 not_found_error: model: claude-3-sonnet-20240229`
- **Fix:** Updated to `claude-sonnet-4-20250514`

### Issue 2: False RAG Matches
- **Problem:** Whipple's disease question matched unrelated gastroenterology content
- **Cause:** Similarity threshold too low (0.70)
- **Fix:** Raised threshold to 0.90

### Issue 3: LLM Falsely Claiming Expert Knowledge
- **Problem:** When RAG returned no matches, LLM still said "expert knowledge"
- **Cause:** Empty `<context></context>` tags still present in prompt
- **Fix:** `buildSystemPrompt()` now removes entire `<context>` block when empty

---

## Database Info

### Container
- Name: `healthpro-db`
- Command: `docker exec healthpro-db psql -U postgres -d healthpro -c "SQL"`

### Key Tables
- `conversation_messages` - Knowledge base (RAG source)
- `professionals` - Expert attribution
- `questions` - User questions
- `answers` - AI and human answers

### Useful Queries
```sql
-- Check if topic exists in knowledge base
SELECT cm.content, p.name, p.specialty
FROM conversation_messages cm
LEFT JOIN professionals p ON cm.professional_id = p.id
WHERE cm.content ILIKE '%topic%' LIMIT 5;

-- Check recent answers and attribution
SELECT q.title, a.attribution_type, a.ai_source,
       array_length(a.source_message_ids, 1) as rag_matches
FROM answers a JOIN questions q ON a.question_id = q.id
ORDER BY a.created_at DESC LIMIT 5;
```

---

## Test Questions

### Should Match RAG (COPD content exists):
> "How should I manage an acute COPD exacerbation in a patient with GOLD stage 3?"

### Should NOT Match RAG:
> "What is the recommended treatment protocol for Whipple's disease?"

---

## Files Modified This Session

| File | Changes |
|------|---------|
| `backend/src/services/llmService.ts` | Model update, dynamic prompt injection, timeouts, logging |
| `backend/src/config/env.ts` | Similarity threshold: 0.90 |

---

## Pending/Known Issues
1. Embedding storage is temporarily disabled (commented out in controllers)
2. May need further prompt tuning for edge cases

---

## Quick Commands

```bash
# Restart backend
cd /Users/sindhubobba/workspace/health-pro-platform/backend && npm run dev

# Check logs for LLM flow
# Look for [LLM] prefixed messages

# Test RAG search
curl "http://localhost:3001/api/debug/search-test?q=COPD"

# Kill process on port
lsof -ti:3001 | xargs kill -9
```
