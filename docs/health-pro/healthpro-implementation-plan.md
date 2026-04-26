# HealthPro Frontend Redesign — Implementation Handoff

## Overview

This document is the single source of truth for implementing the HealthPro frontend redesign. It contains everything an AI coding agent (Claude Code, Cursor) needs to execute: design tokens, component specs, screen-by-screen implementation plan, and integration notes for the existing Next.js + Express codebase.

**Design reference file:** `healthpro-v5-sage.html` (included alongside this document)
The HTML file IS the design spec. Extract exact values from the CSS — don't approximate.

**PRD context files:**
- `healthpro_discovery_locked.md` — product context, competitors, pain points, AI solution
- `healthpro_design_locked.md` — target state journey, AI response component spec, bugs, eval criteria
- `System_Prompt` — the RAG system prompt used by Claude Sonnet 4

---

## 1. Design System — Tokens

### 1.1 Color palette

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#f6f7f3` | Page background |
| `--bg2` | `#eef0e9` | Secondary surface, input backgrounds |
| `--bg3` | `#e4e7de` | Borders, dividers |
| `--bg4` | `#d6d9cf` | Stronger borders, disabled states |
| `--white` | `#fafbf7` | Card backgrounds, elevated surfaces |
| `--ink` | `#1e251e` | Primary text, headings |
| `--ink2` | `#374037` | Secondary text, body copy |
| `--ink3` | `#5b665b` | Tertiary text, descriptions |
| `--ink4` | `#8a948a` | Muted text, placeholders |
| `--ink5` | `#b3bab3` | Disabled text, timestamps |
| `--sage` | `#6b7f5e` | Primary brand color — CTAs, logo, tags, active states |
| `--sage-soft` | `rgba(107,127,94,0.09)` | Sage tinted backgrounds |
| `--sage-mid` | `rgba(107,127,94,0.17)` | Sage hover backgrounds |
| `--sage-deep` | `#4e6142` | Sage hover/pressed states |
| `--olive` | `#7a8548` | Notification banners, alert accents |
| `--olive-soft` | `rgba(122,133,72,0.09)` | Olive tinted backgrounds |
| `--copper` | `#b87741` | Cardiology specialty, warm accent |
| `--copper-soft` | `rgba(184,119,65,0.08)` | Copper tinted backgrounds |
| `--teal` | `#3a8578` | AI response system — label, dot, feedback hover |
| `--teal-soft` | `rgba(58,133,120,0.08)` | AI response header background |
| `--teal-mid` | `rgba(58,133,120,0.15)` | AI feedback hover state |

**Rule:** No purple or violet anywhere in the UI. The AI system uses teal. Specialties use copper (cardiology), sage (endocrinology), teal (pulmonology).

### 1.2 Typography

| Role | Font | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Display headings | Newsreader (Google Fonts) | 300–400 | 24–56px (use `clamp()`) | -0.02em to -0.03em |
| Display italic accent | Newsreader italic | 400 | inherits | inherits |
| Body / UI | Epilogue (Google Fonts) | 400–600 | 12–17px | 0 |
| Labels / eyebrows | Epilogue | 600 | 11–12px | 0.08em–0.12em |
| Code / data | System monospace | 400 | 13px | 0 |

**Font loading:** Import via Google Fonts CDN. Preconnect to `fonts.googleapis.com`.

### 1.3 Spacing and radii

| Token | Value | Usage |
|---|---|---|
| `--r` | `12px` | Inputs, small cards, chips |
| `--r2` | `20px` | Cards, composer, AI response |
| `--r3` | `28px` | Large cards, CTA bands |
| `--r-full` | `999px` | Pills, buttons, tags |

**Spacing scale:** 8, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 80px.
Use rem for section-level vertical rhythm, px for component internals.

### 1.4 Borders

- Default: `1px solid rgba(30,37,30,0.06)` — almost invisible, warm gray
- Stronger: `1px solid rgba(30,37,30,0.05)` on dividers within cards
- Focus ring: `box-shadow: 0 0 0 4px var(--sage-soft)` on focus-within
- AI response border: `1px solid rgba(58,133,120,0.1)` — subtle teal tint

**Important:** No left-accent borders on any cards. No colored left stripes. Cards have uniform borders on all sides.

### 1.5 Shadows

- Card hover: `box-shadow: 0 8px 32px rgba(30,37,30,0.04)` — very subtle
- Hero mockup: `box-shadow: 0 24px 80px rgba(30,37,30,0.06), 0 2px 8px rgba(30,37,30,0.03)`
- Floating dock: `box-shadow: 0 8px 32px rgba(30,37,30,0.18)`

### 1.6 Animation

All animations use `cubic-bezier(0.16, 1, 0.3, 1)` easing (fast out, smooth settle).

| Animation | Duration | Usage |
|---|---|---|
| Page entry (revealUp) | 0.55s | Elements entering viewport, staggered with 0.1s delays |
| Screen transition (fadeIn) | 0.4s | Switching between screens |
| Card hover lift | 0.35s | `transform: translateY(-5px)` on step cards |
| Hint slide | 0.2s | `transform: translateX(5px)` on suggestion cards |
| Button press | 0.15s | `transform: scale(0.97)` on active |
| AI dot pulse | 2.8s | Ring expanding from 1x to 1.7x scale, fading out |
| Floating orbs | 9–13s | `translate + scale` drift behind hero |
| Awaiting spinner | 18s | Full rotation, very slow |

**Stagger pattern for page load:**
```
delay: 0.08s → 0.18s → 0.28s → 0.38s → 0.48s
```

---

## 2. Component Inventory

### 2.1 Navigation bar
- Sticky, blurred background (`backdrop-filter: blur(20px)`, 88% opacity)
- Logo: 32px sage square with rounded corners (10px) + white cross icon + "HealthPro" in Newsreader 20px
- Nav links: Epilogue 14px/500, underline on hover (sage, 2px, scaleX animation)
- CTA button: dark pill (`--ink` background, `--bg` text), full-round radius
- Mobile: hide nav links, keep logo + CTA

### 2.2 Conversational composer (Ask screen)
This replaces the traditional form. Two stacked textareas in one container:
- **Main input:** Newsreader 17px, italic placeholder, for the question itself
- **Detail input:** Epilogue 14px, for clinical context
- **Bottom bar:** tag pills (sage-soft background) + circular send button (sage, 40px)
- **Focus state:** border turns sage, 4px sage-soft glow ring
- Tags are NOT a separate form field — they sit inline at the bottom of the composer

### 2.3 Suggestion cards (Ask screen)
- Below the composer, 3 tappable cards
- Each has: icon (36px rounded square, tinted background) + text (title bold + description) + chevron arrow
- On hover: slides right 5px, border becomes visible, arrow turns sage
- On tap: auto-fills the composer's main input

### 2.4 Question detail card
- White background, 20px radius, 28px padding
- Specialty tag: uppercase pill (copper/sage/teal depending on specialty)
- Title: Newsreader 24px/400
- Asker: avatar circle (34px, sage-soft bg, initials) + name + credentials
- Body: 15px Epilogue, separated by a top border from the asker section

### 2.5 AI response card
- White background, 20px radius, no colored left border
- **Header:** teal-soft background, teal dot with ring-pulse animation, "AI response" label in teal, "Instant match" badge on the right
- **Body:** 15px prose, normal line-height (1.7), paragraph spacing
- **Sources bar:** separated by top border, uppercase label, source chips with avatar initials (sage/copper tinted)
- **Feedback row:** "Was this helpful?" + Yes/No buttons, hover turns teal
- **No vote counts displayed** — feedback is binary signal only

### 2.6 Awaiting specialist block
- Dashed border (1.5px, `--bg4`), 20px radius
- Centered: slow-spinning clock icon (18s rotation) + title + subtitle
- This is the placeholder that renders below the AI response when no human expert has replied

### 2.7 Notification pill
- Olive-soft background, olive text, bell icon
- Single line: "A specialist has been notified and will respond directly."

### 2.8 Landing page sections (new)
- **Hero:** two-column grid (text + mockup), collapses to single column on mobile
- **How it works:** three-column card grid, numbered steps, hover lift animation
- **CTA band:** dark background (--ink), sage CTA button, decorative background orbs
- **Footer:** centered copyright + HIPAA note

---

## 3. Screen-by-Screen Implementation Plan

### Screen 1: Marketing landing page

**Route:** `/` (unauthenticated)

**Sections in order:**
1. Navigation bar (sticky)
2. Hero — eyebrow + headline + subtitle + two CTAs + social proof avatars + product mockup
3. Separator line
4. How it works — three step cards
5. CTA band — dark, with sage button
6. Footer

**New components to create:**
- `LandingHero` — grid layout with text + mockup
- `HowItWorks` — three-card grid
- `CTABand` — dark promotional block
- `Footer` — simple centered footer

**Notes:**
- The hero mockup is a styled div that shows a sample question + AI response — it's decorative, not functional
- Floating orbs behind the mockup are CSS-only (absolute positioned divs with border-radius 50% and keyframe animations)
- All sections should use the `reveal` animation class with staggered delays

### Screen 2: Ask a question (conversational)

**Route:** `/questions/new` (authenticated)

**Current state:** Traditional form with separate fields for title, details, name, tags.

**New UX:** Single conversational composer with suggestion cards below.

**Components:**
- `ConversationalComposer` — the unified input block
  - `QuestionInput` (textarea, Newsreader styled)
  - `ContextInput` (textarea, Epilogue styled)
  - `TagBar` with inline tag pills
  - `SendButton` (circular, sage)
- `SuggestionCard` — tappable prompt starters
  - Props: `icon`, `title`, `description`, `onTap(questionText)`

**Data flow:**
- On submit, construct the same payload as current: `{ title, details, tags }`
- `title` comes from the main textarea
- `details` comes from the context textarea
- `tags` come from the tag pills
- The `name` field is removed — user is already authenticated, pull from session

**Migration notes:**
- The current form posts to the existing question creation endpoint — keep that API contract unchanged
- Add a `SuggestionService` that returns trending/recent questions for the suggestion cards (can be static initially)

### Screen 3: Question detail with AI response

**Route:** `/questions/:id` (existing)

**Current state:** Question card + yellow "AI-generated responses only" banner + AI response with vote arrows + raw markdown.

**New UX:** Clean question card + olive notification pill + teal-themed AI response + awaiting block.

**Components to modify:**
- `QuestionDetail` — restructure with new card design
- `AIResponseCard` — complete redesign
  - Remove: vote arrows, vote count, left purple border, "AI-generated response without expert knowledge base match" sub-label
  - Add: teal header with pulse dot, source chips, binary feedback (yes/no)
  - Add: ring-pulse animation on the AI dot
- `AwaitingBlock` — new component for the pending specialist state
- `NotificationPill` — olive-themed alert replacing the yellow banner

**Bug fixes to incorporate (from DESIGN doc):**
1. Remove vote arrows and count from AI response card ✅ (new design has no votes)
2. Pass answer through markdown renderer ✅ (render as prose, not raw markdown)
3. Remove fallback sub-label that exposes RAG terminology ✅ (new design uses clean fallback)
4. Update form banner copy ✅ (new conversational composer has correct copy)

### Screen 4: Questions feed

**Route:** `/` (authenticated) or `/questions`

**Current state:** Chronological list with basic cards.

**Not in this redesign scope** — the feed was not redesigned in v5. Recommend keeping existing feed with updated color tokens only. A feed redesign can follow as a separate iteration.

---

## 4. File Structure (Recommended)

```
src/
├── styles/
│   └── tokens.css              ← CSS custom properties from Section 1
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx           ← Sticky nav with blurred bg
│   │   ├── Footer.tsx           ← Simple centered footer
│   │   └── PageTransition.tsx   ← Fade-in wrapper for screen transitions
│   ├── landing/
│   │   ├── LandingHero.tsx      ← Hero with mockup
│   │   ├── HowItWorks.tsx       ← Three-step grid
│   │   └── CTABand.tsx          ← Dark promotional block
│   ├── ask/
│   │   ├── ConversationalComposer.tsx  ← The unified input
│   │   └── SuggestionCard.tsx          ← Tappable prompt starters
│   ├── question/
│   │   ├── QuestionCard.tsx     ← Question detail card
│   │   ├── AIResponseCard.tsx   ← Teal-themed AI response
│   │   ├── AwaitingBlock.tsx    ← Pending specialist placeholder
│   │   └── NotificationPill.tsx ← Olive alert banner
│   └── shared/
│       ├── SpecialtyTag.tsx     ← Colored specialty pill
│       ├── Avatar.tsx           ← Initials circle
│       └── SourceChip.tsx       ← Expert attribution chip
└── pages/
    ├── index.tsx                ← Landing (unauth) or Feed (auth)
    ├── questions/
    │   ├── new.tsx              ← Conversational ask
    │   └── [id].tsx             ← Question detail
    └── _app.tsx                 ← Add Google Fonts, global tokens
```

---

## 5. Integration Notes

### 5.1 API contracts (unchanged)
The redesign is frontend-only. All existing API endpoints remain the same:
- `POST /api/questions` — create question (title, details, tags)
- `GET /api/questions/:id` — get question with answers
- `GET /api/questions` — list questions
- `POST /api/answers/:id/feedback` — submit helpful/not-helpful

### 5.2 AI response rendering
- The AI response text currently renders as raw markdown (Bug #2 in DESIGN doc)
- Install and use `react-markdown` to render the response prose
- Style the rendered output to match the design: 15px Epilogue, 1.7 line-height, paragraph spacing
- Do NOT render markdown headers, bold, or lists inside AI responses — the system prompt now instructs prose-only output

### 5.3 Source attribution
- Source chips (specialist name, credentials, specialty) are populated from retrieval metadata, NOT from the LLM output
- The AI response card receives sources as a prop from the API response
- Each source chip renders: avatar circle with initials + "Dr. [Name], [Credentials]"

### 5.4 Fallback state
When the AI has no match (0 results above similarity threshold OR GPT-4o judge returns insufficient):
- The AI response card header still renders (teal dot + "AI response" label)
- Body text becomes: "I don't have any expert-verified conversations on this topic yet. A specialist will review your question and respond."
- Sources bar is hidden
- Feedback row is hidden
- The fallback message is identical regardless of internal cause (no RAG match vs insufficient context)

### 5.5 Google Fonts loading
Add to `_app.tsx` or `_document.tsx`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&family=Epilogue:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 5.6 Responsive breakpoints
- `800px` — hero grid collapses from 2-col to 1-col
- `700px` — step cards collapse from 3-col to 1-col, nav links hide
- `600px` — container padding reduces from 24px to 18px

---

## 6. Implementation Order

Execute in this sequence to minimize merge conflicts and maximize testability:

### Phase 1: Design tokens + global styles
1. Create `tokens.css` with all CSS custom properties
2. Add Google Fonts to `_document.tsx`
3. Update global styles (body background, default font)
4. Update `Navbar` component with new design

### Phase 2: Question detail screen
1. Redesign `AIResponseCard` component (teal theme, ring pulse, no votes)
2. Create `AwaitingBlock` component
3. Create `NotificationPill` component
4. Update `QuestionDetail` page layout
5. Fix Bug #2: install `react-markdown`, render AI prose
6. Fix Bug #3: remove fallback sub-label
7. Verify fallback state renders correctly

### Phase 3: Ask screen
1. Create `ConversationalComposer` component
2. Create `SuggestionCard` component
3. Replace the existing form on `/questions/new`
4. Fix Bug #4: update copy to match new design
5. Remove the "Your Name" field (use session data)
6. Verify question submission still works with existing API

### Phase 4: Landing page
1. Create `LandingHero`, `HowItWorks`, `CTABand`, `Footer` components
2. Create landing page route (unauthenticated `/`)
3. Add entry animations with staggered delays
4. Add floating orb animations behind hero mockup

### Phase 5: Polish
1. Add page transition animations between screens
2. Add hover/active states on all interactive elements
3. Test responsive behavior at 375px, 700px, 800px, 1200px
4. Verify all animations respect `prefers-reduced-motion`

---

## 7. What NOT to Build

- **No specialty filter system** — not currently supported in the backend
- **No notification system** — planned for future iteration
- **No profile screen** — out of scope for this redesign
- **No feed redesign** — keep existing feed, only update color tokens
- **No dark mode** — single light theme only
- **No delete button** — being removed before pilot (per DESIGN doc)

---

## 8. Handoff Files Checklist

| File | Purpose | Required |
|---|---|---|
| `healthpro-v5-sage.html` | Design reference — extract exact CSS values | Yes |
| `healthpro-implementation-plan.md` | This document — implementation spec | Yes |
| `healthpro_discovery_locked.md` | Product context, pain points, differentiators | Yes |
| `healthpro_design_locked.md` | AI response spec, fallback rules, bugs, eval criteria | Yes |
| `System_Prompt` | The RAG system prompt for Claude Sonnet 4 | Yes |

**Instruction for the AI agent:**
"Read all five files before writing any code. The HTML file is the design spec — extract exact color values, font sizes, spacing, and border radii from the CSS custom properties. The implementation plan defines the component structure and build order. The PRD files define the product rules you must follow — especially the AI response behavior, fallback states, and attribution requirements."
