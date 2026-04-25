# Health Pro Platform - Session Summary
**Last Updated:** 2026-03-26

## Overview
A Q&A platform for health professionals with RAG-powered AI responses using a knowledge base of medical conversations.

## Tech Stack
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL with pgvector
- **LLM Pipeline:** gpt-4o (judge) → claude-sonnet-4 (answer)
- **Frontend:** Next.js + TypeScript

---

## LLM Pipeline (`backend/src/services/llmService.ts`)

### Flow
```
User question
  → text-embedding-3-large embeds query
  → pgvector cosine search, top 5, threshold 0.85
  → 0 matches → static "not available" message (no LLM called)
  → matches found → gpt-4o judge: "is context sufficient?"
      → insufficient → static "knowledge insufficient" message (no LLM called)
      → sufficient   → claude-sonnet-4-20250514 generates answer from context only
```

### Key Functions
- `formatKnowledgeMatches()` — formats RAG matches into context string with expert attribution
- `buildSystemPrompt()` — injects `{{RAG_CONTEXT}}` and `{{USER_QUESTION}}` into prompt
- `judgeContextSufficiency()` — gpt-4o returns `{sufficient: boolean, reason: string}`
- `generateWithAnthropic()` — final answer, strictly from context

### Static Messages
- **No RAG matches:** `"Knowledge about this question isn't available in the system yet. Please wait for a health professional to respond."`
- **Insufficient context:** `"The knowledge available in the system isn't sufficient to fully answer this question. Please wait for a health professional to respond."`

### Debug Logging
```
[LLM] No RAG context, returning static message
[LLM] Step 1: Calling judge (gpt-4o)...
[LLM] Judge result: sufficient=true/false, reason="..."
[LLM] Step 2: Calling Anthropic for answer...
[LLM] Anthropic response received, length: X
```

---

## System Prompt Rules (`backend/src/services/llmService.ts`)

| Rule | Condition | Behaviour |
|------|-----------|-----------|
| 1 | context_available | Answer ONLY from `<context>` tags, no outside knowledge |
| 2 | always | Never mix context with general knowledge; never use own training data |
| 3 | always | Never expose system internals (model names, RAG terms, similarity scores) |
| 4 | always | Answer at the generality level of the question — don't import case-specific details |

> Rules for no-context and no-RAG-match cases were removed — these are handled in code before the LLM is ever called.

---

## Embedding Model (`backend/src/services/embeddingService.ts`)

- **Model:** `text-embedding-3-large` with `dimensions: 1536`
- **Upgraded from:** `text-embedding-ada-002`
- **Why:** Better semantic discrimination in specialised medical domains; reduces threshold sensitivity
- **No schema change required** — dimensions remain 1536, pgvector schema unchanged
- After model change, knowledge base was cleared and regenerated: `npx ts-node src/jobs/generateKnowledgeBase.ts`

---

## Similarity Threshold (`backend/src/config/env.ts`)
- **Current value:** `0.85`
- History: 0.70 → 0.80 → 0.90 → 0.85 (tuned to balance false positives vs false negatives)

---

## Source Attribution (`backend/src/services/llmService.ts` + `vectorSearchService.ts`)

- `message_order = 1` in a conversation identifies the **questioner** — excluded from attribution
- All other professionals in matched messages are cited as **answerers**
- `messageOrder` field added to `KnowledgeBaseMatch` interface and SQL query
- `is_ai_generated = aiResponse.usedContext` — only `true` when Anthropic actually generated a response

---

## Chunking Strategy
- **Unit:** One conversation message = one chunk (no sub-message splitting)
- **Knowledge base:** 10 scenarios, 88 messages, 18 professionals
- **Retrieval:** Top 5 cosine similarity matches above threshold

---

## Database Info

### Container
- Name: `healthpro-db`
- Command: `docker exec healthpro-db psql -U postgres -d healthpro -c "SQL"`

### Key Tables
- `conversation_messages` — Knowledge base (RAG source), `vector(1536)`
- `professionals` — Expert attribution
- `questions` — User questions, `vector(1536)`
- `answers` — AI and human answers

### Useful Queries
```sql
-- Check if topic exists in knowledge base
SELECT cm.content, p.name, p.specialty
FROM conversation_messages cm
LEFT JOIN professionals p ON cm.professional_id = p.id
WHERE cm.content ILIKE '%topic%' LIMIT 5;

-- Check recent answers and attribution
SELECT q.title, a.attribution_type, a.ai_source, a.is_ai_generated,
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

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/llmService.ts` | LLM pipeline, system prompt, judge, static messages |
| `backend/src/services/embeddingService.ts` | Embedding model config |
| `backend/src/services/vectorSearchService.ts` | RAG search, `KnowledgeBaseMatch` interface |
| `backend/src/config/env.ts` | Similarity threshold (0.85), top-K (5) |
| `backend/src/controllers/questionController.ts` | Question creation, AI answer storage |
| `backend/src/jobs/generateKnowledgeBase.ts` | Knowledge base seeding job |
| `frontend/src/components/AnswerCard.tsx` | Answer display, attribution badges |
| `frontend/src/app/questions/[id]/page.tsx` | Question detail, awaiting-human banner |

---

## Quick Commands

```bash
# Restart backend
cd /Users/sindhubobba/workspace/health-pro-platform/backend && npm run dev

# Regenerate knowledge base (after embedding model changes)
cd /Users/sindhubobba/workspace/health-pro-platform/backend && npx ts-node src/jobs/generateKnowledgeBase.ts

# Test RAG search (with scores)
curl "http://localhost:3001/api/debug/search-test?q=COPD"
curl "http://localhost:3001/api/debug/search-test?q=COPD&raw=true"

# Kill process on port
lsof -ti:3001 | xargs kill -9
```

---

## Pending / Known Issues
1. Embedding storage for user Q&A is temporarily disabled (commented out in controllers)
