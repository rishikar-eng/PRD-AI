# Rian PRD Pipeline — CLAUDE.md
# Claude Code context file for building the PRD Pipeline
# Read this ENTIRE file before writing a single line of code.
# This is the single source of truth. When in doubt, ask — do not assume.

---

## What You Are Building

The Rian PRD Pipeline is an internal web application that takes a raw feature idea
and produces a quality-controlled, agent-reviewed, design-ready Product Requirements
Document through a multi-stage AI pipeline.

**V1 scope: Stages 1–6 (PRD generation + owner review)**
**V2 scope: Adds 4 specialist agents + Stage 2 handoff bundle**

This CLAUDE.md covers V1 + V2 together. Build V1 first, confirm it works,
then layer V2 on top without touching V1 code.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (functional components, hooks only — no class components) |
| Backend | Node.js + Express |
| AI | OpenAI API (gpt-4o) — swap to Anthropic in one line (all calls through ai.js) |
| Auth | RianAPI existing authentication |
| Database | None — session state only, in-memory on Node.js server |
| Styling | CSS custom properties — Rian brand system defined below |
| Package manager | npm |

---

## Project Structure

```
/rian-prd-pipeline
  /client
    /src
      /components
        EntryMode.jsx              ← Stage 1: idea input + role selection
        IntakeChat.jsx             ← Stage 2: conversational intake (AI)
        AgentPipeline.jsx          ← Stages 3–5 (V1) / 3–8 (V2): agents running
        ReviewStage.jsx            ← Stage 6: side-by-side PRD + comments
        PRDDocument.jsx            ← PRD renderer (left panel)
        CommentPanel.jsx           ← Agent comments (right panel)
        CommentCard.jsx            ← Individual comment: Accept/Reject/Edit
        Stage2Handoff.jsx          ← V2: handoff bundle generator (manual trigger)
        NavBar.jsx
        StageIndicator.jsx
      /styles
        globals.css                ← Design tokens + base styles
        components.css
      App.jsx
      main.jsx
  /server
    /routes
      auth.js                     ← RianAPI auth
      intake.js                   ← Intake conversation endpoints
      agents.js                   ← All agent pipeline endpoints
      handoff.js                  ← V2: Stage 2 handoff bundle generation
    /prompts
      intake.js
      writer.js
      qc.js
      deliveryReality.js          ← V2 specialist
      technicalFeasibility.js     ← V2 specialist
      businessValue.js            ← V2 specialist
      security.js                 ← V2 specialist
      debate.js
      successMetric.js            ← V2: generates metric after intake
      qualityGate.js              ← V2: pre-flight checks before finalise
      claudeContext.js            ← V2: generates claude.md implementation brief
      stage2Handoff.js            ← V2: generates feature-aware Stage 2 prompt
    /services
      ai.js                       ← Single file for all OpenAI calls — never import OpenAI elsewhere
      zipBuilder.js               ← V2: builds Stage 2 zip bundle
    /assets
      rian_theme_reference.html   ← Stored Rian design system reference (Animation Rate Card)
    /middleware
      auth.js
    server.js
  package.json
  .env.example
  CLAUDE.md
```

---

## The Full Pipeline

### V1 — Stages 1–6 (Build First)

```
Stage 1: Idea Capture      → User enters idea, selects role
Stage 2: AI Intake         → Conversational interview (max 6 turns)
Stage 3: Writer Agent      → Streams 13-section PRD (SSE)
Stage 4: QC Agent          → Scores 4 dimensions, annotates gaps
Stage 5: Debate Agent      → Adversarial meta-review
Stage 6: Owner Review      → Side-by-side PRD + Accept/Reject/Edit
         └─ Finalise PRD   → Download + copy
         └─ [V2] Stage 2 Handoff button (manual trigger, appears after finalise)
```

### V2 — Additional Agents (Layer On After V1 Ships)

```
Stage 3: Writer Agent      → Same as V1
Stage 4: QC Agent          → Same as V1
Stage 4b: Success Metric   → NEW: AI drafts suggested metric after intake, owner confirms
Stage 5a: Delivery Reality → NEW: First specialist (runs before Technical)
Stage 5b: Technical Agent  → NEW: Second specialist
Stage 5c: Business Agent   → NEW: Third specialist
Stage 5d: Security Agent   → NEW: Fourth specialist
Stage 5e: Debate Agent     → NOW: Meta-layer reading all 4 specialist outputs + owner responses
Stage 6:  Owner Review     → NOW: Owner pauses after EVERY agent, writes free-text response
          Quality Gate     → NEW: Pre-flight hard blocks before finalise button appears
Stage 2 Handoff            → NEW: Manual trigger → zip bundle download
```

---

## Stage Specifications — V1

### Stage 1 — Idea Capture (EntryMode.jsx)

Three entry modes:
- **One-liner** — single text input, min 10 characters
- **Rough notes** — textarea for email threads, briefs, existing docs
- **Upload** — .txt or .md file upload, content read as text

Role selector (required before advancing):
- CEO / Founder
- Product
- Tech Lead
- R&D

Role is sent with every subsequent API call so agents tailor output accordingly.

### Stage 2 — AI Intake (IntakeChat.jsx)

Real OpenAI API calls. Max 6 turns.
AI reads raw input and asks only about what is not already answered.
After each question: 4–5 clickable suggestion pills shown.
Signal to end intake: `INTAKE_COMPLETE` on a new line.

Structured data object built during intake (passed to Writer Agent):
```json
{
  "featureName": "",
  "role": "",
  "problem": "",
  "users": "",
  "successOutcome": "",
  "inScope": "",
  "outOfScope": "",
  "userFlows": "",
  "configuration": "",
  "failureStates": "",
  "constraints": "",
  "openQuestions": ""
}
```

### Stage 3 — Writer Agent (AgentPipeline.jsx — Step 1)

Streams PRD output token by token via SSE.
User sees PRD being written in real time.
Progress indicator: "Writer Agent running..."

Output: Full PRD in Rian format — **13 sections** (not 12 — Success Metric is a required section).
Stored in session state as `prd.v0`.

**The 13 required sections in order:**
1. ## Objective
2. ## Success Metric
3. ## Definitions
4. ## In Scope
5. ## Out of Scope
6. ## User Flow
7. ## Configuration
8. ## Validation Rules
9. ## Failure Handling
10. ## Implementation Examples
11. ## Architecture Constraints
12. ## Acceptance Criteria
13. ## Open Questions

### Stage 4 — QC Agent (AgentPipeline.jsx — Step 2)

Runs automatically after Writer. No user interaction.
Scores PRD on 4 dimensions (1–5 each): Clarity, Feasibility, Scope, Testability.
Average < 3.5 = warning banner shown (does NOT block in V1).

JSON output format:
```json
{
  "scores": {
    "clarity": 4,
    "feasibility": 3,
    "scope": 4,
    "testability": 5,
    "average": 4.0,
    "passed": true
  },
  "comments": [
    {
      "id": "qc-1",
      "section": "Acceptance Criteria",
      "type": "constructive",
      "agent": "QC",
      "text": "...",
      "status": "pending"
    }
  ]
}
```

### Stage 5 — Debate Agent (AgentPipeline.jsx — Step 3)

V1: Runs automatically after QC. 60% constructive / 40% adversarial.
If any QC dimension < 2.5: escalates to fully adversarial on that section.
Escalation shown to owner with specific explanation of which answer triggered it.

JSON output format:
```json
{
  "escalated": false,
  "escalationReason": null,
  "comments": [
    {
      "id": "debate-1",
      "section": "In Scope",
      "type": "adversarial",
      "agent": "Debate",
      "text": "...",
      "status": "pending",
      "escalated": false
    }
  ]
}
```

### Stage 6 — Owner Review (ReviewStage.jsx)

Side-by-side layout:
- **Left panel (60%)** — PRD document with section headings
- **Right panel (40%)** — all agent comments grouped by agent (QC first, Debate second)

Each comment card:
- Agent badge + Type badge (Constructive / Adversarial)
- Section reference
- Comment text
- **Accept** — marks accepted, highlights PRD section in amber
- **Reject** — greys out comment card
- **Edit** — opens inline text field, owner writes response before accepting

When all comments actioned: "Finalise PRD" button appears.
Finalise → produces final PRD with sufficiency score + download + copy options.

After finalise: "Prepare Stage 2 Handoff" button appears (manual trigger — owner clicks only if UI/UX design is needed. Not every feature needs it).

---

## Stage Specifications — V2 (Layer On After V1)

### Success Metric Generation (after intake, before Writer)

After intake completes, before Writer Agent runs:
1. Call `successMetric.js` prompt with full conversation history
2. AI returns a single plain-text suggested metric (e.g. "Reduce AD script cleanup from 45 min to 15 min per episode...")
3. Show to owner as an editable text field with label "Suggested success metric — confirm or edit"
4. Owner confirms or rewrites
5. Confirmed metric injected into `structuredData.successMetric` before passing to Writer Agent

### V2 Agent Pipeline Order

```
Writer → Delivery Reality → Technical Feasibility → Business Value → Security → Debate
```

Each agent runs sequentially. After EACH agent completes:
- Pipeline pauses
- Owner sees agent output on the right panel
- Owner writes a free-text response in a textarea (not Accept/Reject per comment)
- "Continue to next agent" button advances the pipeline
- Next agent receives: PRD + all previous agent outputs + all owner responses as accumulated context

Owner free-text response is stored in session:
```json
{
  "agentResponses": {
    "deliveryReality": "Yes, we confirmed this with the AD writing team last week...",
    "technicalFeasibility": "Good point on Lambda timeout — we'll use Fargate for this...",
    "businessValue": "The time saving is actually 20 min not 10 — I miscalculated...",
    "security": "We have a DPA with ElevenLabs signed in March 2025..."
  }
}
```

### V2 Specialist Agent Output Format

All 4 specialist agents return the same JSON shape:
```json
{
  "comments": [
    {
      "id": "delivery-1",
      "section": "User Flow",
      "type": "concern",
      "agent": "Delivery Reality",
      "text": "...",
      "status": "pending",
      "escalated": false
    }
  ]
}
```

### V2 Debate Agent (Meta-Layer)

V2 Debate Agent is different from V1.
It does NOT review the PRD directly.
It reads ALL 4 specialist outputs + ALL owner responses and finds:
- Where specialists agreed too easily
- Contradictions between specialists (e.g. Technical says 1 week, Business calculated ROI on that)
- Collective blind spots all agents missed
- Vague or unconvincing owner responses to hard concerns

Debate Agent function signature: `getDebateSystemPrompt(specialistFeedback, ownerResponses)`

### Quality Gate (Pre-Flight Before Finalise)

Runs when owner clicks "Finalise PRD" — blocks if hard conditions not met.

**Hard blocks (PRD cannot be finalised):**
- Any of the 13 sections is missing or is a placeholder (TBD, N/A, add later)
- Success Metric is not measurable (no current state, target, or timeframe)
- Fewer than 15 binary [ ] acceptance criteria
- Open Questions contain vague language (consider, think about, TBD, maybe)
- Fewer than 2 failure states in User Flow
- Any of the 5 Rian hard rules missing from Architecture Constraints

**Soft warnings (shown but owner can override):**
- Implementation Examples don't reference Rian table/service names
- User Flow has fewer than 5 numbered steps
- Failure Handling has fewer than 3 failure modes
- No target completion date
- Architecture Constraints section is thin beyond the 5 hard rules

Quality Gate JSON output:
```json
{
  "hardBlocks": [
    { "id": "block-1", "issue": "...", "severity": "hard", "section": "..." }
  ],
  "softWarnings": [
    { "id": "warn-1", "issue": "...", "severity": "soft", "section": "..." }
  ],
  "canShip": false,
  "summary": "2 hard blocks must be resolved before this PRD can be finalised."
}
```

### Stage 2 Handoff System

**Trigger:** Owner clicks "Prepare Stage 2 Handoff" after finalising PRD.
This button only appears after finalise. It is never automatic.
Not every feature needs it — backend features and data pipeline features skip this entirely.

**What Stage 2 is for:**
Stage 2 is where the owner takes the PRD to Claude (web) and generates HTML mockups
of the UI/UX before coming back for Stage 3 (external PRD review + claude.md generation).

**The handoff generates a zip bundle containing 3 files:**

```
stage2_handoff_[featureName].zip
  ├── PRD_v1.0.md                  ← The finalised PRD as markdown
  ├── rian_theme_reference.html    ← The stored Rian design system (always same file)
  └── stage2_prompt.txt            ← Feature-aware Claude prompt (generated per PRD)
```

**The feature-aware prompt (stage2_prompt.txt):**

Generated by `stage2Handoff.js` prompt file.
Reads 3 sections of the PRD: User Flow, Configuration, Failure Handling.
Produces a Claude prompt that tells Claude exactly which screens to mock up,
which config panels to design, and which error states to show.

Example output structure for stage2_prompt.txt:
```
I am designing UI/UX mockups for a Rian feature. Below is the PRD and the Rian design system reference HTML.

FEATURE: [featureName]

SCREENS TO MOCK UP:
Based on the User Flow section:
- Screen 1: [flow step description]
- Screen 2: [flow step description]
...

CONFIG PANELS TO DESIGN:
Based on the Configuration section:
- [parameter name]: [description of control]
...

ERROR STATES TO SHOW:
Based on the Failure Handling section:
- [failure mode]: [UX copy to display]
...

DESIGN REQUIREMENTS:
- Match the Rian brand system in the attached rian_theme_reference.html exactly
- Pure black background (#000000)
- Plus Jakarta Sans font
- Pink → orange → green gradient for primary CTAs
- Dark cards (#111111) with subtle borders

Please generate HTML mockups for each screen listed above, matching the Rian visual style.
```

**Backend implementation (handoff.js route):**
```javascript
POST /api/handoff/stage2
Body: { prdText, featureName }
Process:
  1. Call stage2Handoff.js prompt with prdText → get feature-aware prompt text
  2. Read rian_theme_reference.html from /server/assets/
  3. Convert prdText to markdown file
  4. Build zip using zipBuilder.js (JSZip or archiver)
  5. Return zip as download stream
```

**zipBuilder.js:**
Use `archiver` npm package. Three files in zip. Return as buffer.
File names: `PRD_v1.0.md`, `rian_theme_reference.html`, `stage2_prompt.txt`

---

## Session State Shape (V2 — in-memory)

```json
{
  "sessionId": "uuid",
  "userId": "from-rian-api",
  "role": "CEO",
  "stage": 1,
  "input": { "raw": "", "mode": "oneline" },
  "intake": {
    "conversationHistory": [],
    "structuredData": {}
  },
  "successMetric": {
    "suggested": "",
    "confirmed": ""
  },
  "prd": {
    "v0": "",
    "qcResult": { "scores": {}, "comments": [] },
    "specialistResults": {
      "deliveryReality": { "comments": [] },
      "technicalFeasibility": { "comments": [] },
      "businessValue": { "comments": [] },
      "security": { "comments": [] }
    },
    "agentResponses": {
      "deliveryReality": "",
      "technicalFeasibility": "",
      "businessValue": "",
      "security": ""
    },
    "debateResult": { "escalated": false, "escalationReason": null, "comments": [] },
    "qualityGateResult": { "hardBlocks": [], "softWarnings": [], "canShip": false },
    "allComments": [],
    "finalPRD": ""
  },
  "review": {
    "commentActions": {}
  },
  "handoff": {
    "stage2Generated": false,
    "stage2GeneratedAt": null
  }
}
```

---

## API Endpoints

### V1 Endpoints
```
POST /api/auth/login                     → Proxies to RianAPI. Returns { token, user }
POST /api/intake/start                   → Body: { role, input, inputMode } → First question + suggestions
POST /api/intake/reply                   → Body: { role, conversationHistory, reply } → Next question OR { complete: true, structuredData }
POST /api/agents/writer                  → Body: { role, structuredData } → SSE stream of PRD text
POST /api/agents/qc                      → Body: { role, prdText } → { scores, comments }
POST /api/agents/debate                  → Body: { role, prdText, qcScores } → { escalated, escalationReason, comments }
```

### V2 Additional Endpoints
```
POST /api/agents/success-metric          → Body: { conversationHistory } → plain text metric string
POST /api/agents/delivery-reality        → Body: { prdText, ownerContext } → { comments }
POST /api/agents/technical-feasibility   → Body: { prdText, ownerContext } → { comments }
POST /api/agents/business-value          → Body: { prdText, ownerContext } → { comments }
POST /api/agents/security                → Body: { prdText, ownerContext } → { comments }
POST /api/agents/debate-v2               → Body: { prdText, specialistFeedback, ownerResponses } → { escalated, escalationReason, comments }
POST /api/agents/quality-gate            → Body: { prdText } → { hardBlocks, softWarnings, canShip, summary }
POST /api/agents/claude-context          → Body: { finalPRD, agentFeedback, ownerResponses, mockupsDescription? } → markdown text
POST /api/handoff/stage2                 → Body: { prdText, featureName } → zip file download
```

---

## Design System — Rian Brand

Apply consistently across all components. Do not deviate.

### Colour Tokens

```css
:root {
  --bg: #000000;
  --bg-surface: #0a0a0a;
  --bg-card: #111111;
  --bg-card-hover: #161616;
  --border: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.12);
  --border-active: rgba(255, 255, 255, 0.20);
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --text-tertiary: #555555;
  --pink: #f472b6;
  --pink-hot: #ec4899;
  --green: #86efac;
  --green-bright: #4ade80;
  --teal: #5eead4;
  --orange: #fb923c;
  --yellow: #facc15;
  --constructive: #4ade80;
  --adversarial: #f472b6;
  --warning: #fb923c;
  --accepted: #4ade80;
  --rejected: #555555;
  --radius: 14px;
  --radius-sm: 10px;
  --radius-xs: 6px;
}
```

### Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

body {
  font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
```

Font weight usage:
- 800 — hero titles, logo
- 700 — section headings, buttons, badges
- 600 — card titles, labels
- 500 — body emphasis
- 400 — body text
- 300 — hints, tertiary

### Navigation Bar

```css
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  padding: 14px 32px;
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
```

Logo: "Rian" in gradient text (pink → orange → green), 19px, 800 weight.
Badge: "PRD Builder" — 11px, border: 1px solid var(--border), border-radius 999px, padding 2px 9px.

### Gradient — Use on Hero Text and Primary CTAs Only

```css
.gradient-text {
  background: linear-gradient(135deg, #f472b6 0%, #fb923c 40%, #4ade80 70%, #5eead4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.btn-primary {
  background: linear-gradient(135deg, #ec4899, #fb923c 60%, #facc15);
  color: #000;
  font-weight: 800;
  border: none;
}
```

### Cards

```css
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  transition: border-color 0.2s, background 0.2s;
}
.card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
```

### Agent Badges

```css
.badge { padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.badge-writer   { background: rgba(94,234,212,0.1);  color: #5eead4; border: 1px solid rgba(94,234,212,0.2); }
.badge-qc       { background: rgba(251,146,60,0.1);  color: #fb923c; border: 1px solid rgba(251,146,60,0.2); }
.badge-delivery { background: rgba(250,204,21,0.1);  color: #facc15; border: 1px solid rgba(250,204,21,0.2); }
.badge-tech     { background: rgba(94,234,212,0.1);  color: #5eead4; border: 1px solid rgba(94,234,212,0.2); }
.badge-business { background: rgba(74,222,128,0.1);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
.badge-security { background: rgba(244,114,182,0.1); color: #f472b6; border: 1px solid rgba(244,114,182,0.2); }
.badge-debate   { background: rgba(244,114,182,0.1); color: #f472b6; border: 1px solid rgba(244,114,182,0.2); }
.badge-constructive { background: rgba(74,222,128,0.1);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
.badge-adversarial  { background: rgba(244,114,182,0.1); color: #f472b6; border: 1px solid rgba(244,114,182,0.2); }
.badge-escalated    { background: rgba(251,146,60,0.1);  color: #fb923c; border: 1px solid rgba(251,146,60,0.2); }
```

### Buttons

```css
.btn-primary   { padding:12px 28px; border:none; border-radius:var(--radius-sm); background:linear-gradient(135deg,#ec4899,#fb923c 60%,#facc15); color:#000; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; transition:opacity 0.2s,transform 0.2s; }
.btn-primary:hover:not(:disabled) { opacity:0.88; transform:translateY(-1px); }
.btn-primary:disabled { opacity:0.3; cursor:default; transform:none; }
.btn-secondary { padding:10px 22px; border:1px solid var(--border); border-radius:var(--radius-sm); background:transparent; color:var(--text-secondary); font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; }
.btn-secondary:hover { border-color:var(--border-hover); color:var(--text-primary); }
.btn-accept { padding:6px 14px; border:1px solid rgba(74,222,128,0.3); border-radius:var(--radius-xs); background:rgba(74,222,128,0.08); color:#4ade80; font-size:12px; font-weight:700; cursor:pointer; }
.btn-reject { padding:6px 14px; border:1px solid var(--border); border-radius:var(--radius-xs); background:transparent; color:var(--text-tertiary); font-size:12px; font-weight:700; cursor:pointer; }
.btn-edit   { padding:6px 14px; border:1px solid rgba(244,114,182,0.3); border-radius:var(--radius-xs); background:rgba(244,114,182,0.08); color:#f472b6; font-size:12px; font-weight:700; cursor:pointer; }
```

### Typing Indicator

```css
.typing-dots { display:inline-flex; gap:4px; }
.typing-dots span { width:6px; height:6px; border-radius:50%; background:var(--text-tertiary); animation:blink 1.2s infinite; }
.typing-dots span:nth-child(2) { animation-delay:0.2s; }
.typing-dots span:nth-child(3) { animation-delay:0.4s; }
@keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
```

---

## Prompt Files — Summary

All prompts live in `/server/prompts/`. All AI calls go through `/server/services/ai.js` only.

| File | Agent | Output format | V1 or V2 |
|---|---|---|---|
| intake.js | Intake conversation | Text + SUGGESTIONS: + INTAKE_COMPLETE | V1 |
| writer.js | PRD Writer | Markdown (13 sections) | V1 |
| qc.js | QC scoring | JSON: { scores, comments } | V1 |
| debate.js | Debate meta-layer | JSON: { escalated, escalationReason, comments } | V1+V2 |
| successMetric.js | Metric suggestion | Plain text string | V2 |
| deliveryReality.js | Specialist 1 | JSON: { comments } | V2 |
| technicalFeasibility.js | Specialist 2 | JSON: { comments } | V2 |
| businessValue.js | Specialist 3 | JSON: { comments } | V2 |
| security.js | Specialist 4 | JSON: { comments } | V2 |
| qualityGate.js | Pre-flight gate | JSON: { hardBlocks, softWarnings, canShip, summary } | V2 |
| claudeContext.js | Implementation brief | Markdown (claude.md style) | V2 |
| stage2Handoff.js | Stage 2 prompt | Plain text (stage2_prompt.txt content) | V2 |

**stage2Handoff.js prompt behaviour:**
- Reads User Flow, Configuration, Failure Handling sections of the PRD
- Extracts: screen names from User Flow, config panel parameters, error state messages
- Generates a feature-specific Claude prompt naming each screen, config panel, and error state
- Output is plain text — the contents of stage2_prompt.txt in the zip bundle

---

## Hard Rules — Never Violate

- No database in V1 or V2. All state is in-memory on the Node.js server per session.
- No hardcoded API keys. All keys via environment variables (.env file).
- .env.example must be committed. .env must be in .gitignore.
- All OpenAI calls through `/server/services/ai.js` only. Never import OpenAI in routes.
- Writer Agent streams via SSE — never wait for full response before sending to frontend.
- Specialist agents (V2) run sequentially — never in parallel.
- All agent responses are JSON (except writer, successMetric, claudeContext, stage2Handoff which return text/markdown).
- If JSON parsing fails: return graceful error, never crash the server.
- CORS: localhost in development, Rian domain in production.
- Frontend never calls OpenAI directly. All AI calls go through Node.js backend.
- The Rian theme reference HTML is stored at `/server/assets/rian_theme_reference.html` — never user-uploaded, always system-provided.
- Stage 2 Handoff is always a manual trigger — never automatic.
- Zip bundle uses `archiver` npm package — never base64 encode large files.

---

## Environment Variables (.env.example)

```
OPENAI_API_KEY=your-openai-key-here
RIAN_API_BASE_URL=https://api.rian.io
RIAN_API_KEY=your-rian-api-key-here
PORT=3001
NODE_ENV=development
SESSION_SECRET=generate-a-random-string-here
CORS_ORIGIN=http://localhost:3000
```

---

## Build Order for Claude Code

Build in this exact order. Confirm each step before advancing.

### V1 Build (Steps 1–20)

1.  Project scaffold — folder structure, package.json files, .env.example, .gitignore
2.  Install dependencies — express, cors, express-session, openai, archiver, uuid
3.  Design system — globals.css with all tokens and base styles
4.  NavBar.jsx and StageIndicator.jsx
5.  server.js — Express setup with CORS, session middleware, route mounting
6.  Auth route + middleware — /api/auth/login proxying to RianAPI
7.  Stage 1 — EntryMode.jsx (three entry modes + role selector)
8.  intake.js prompt file + /api/intake routes (start + reply)
9.  Stage 2 — IntakeChat.jsx (conversation UI with suggestion pills)
10. writer.js prompt file + /api/agents/writer (SSE streaming)
11. Stage 3 — AgentPipeline.jsx Writer step (streaming PRD display)
12. qc.js prompt file + /api/agents/qc
13. Stage 4 — AgentPipeline.jsx QC step (scores + annotation display)
14. debate.js prompt file + /api/agents/debate
15. Stage 5 — AgentPipeline.jsx Debate step (escalation badge + explanation display)
16. PRDDocument.jsx — PRD renderer component (markdown to HTML, section headings)
17. CommentCard.jsx — Accept / Reject / Edit with inline edit field
18. CommentPanel.jsx — all comments grouped by agent
19. Stage 6 — ReviewStage.jsx (side-by-side 60/40 layout)
20. Final PRD output — Finalise button → download .txt + copy to clipboard
    Smoke test — run full session manually end-to-end. Confirm before V2.

### V2 Build (Steps 21–35) — Only After V1 Smoke Test Passes

21. successMetric.js prompt + /api/agents/success-metric endpoint
22. Success Metric UI — editable suggestion shown after intake, before Writer runs
23. deliveryReality.js, technicalFeasibility.js, businessValue.js, security.js prompt files
24. /api/agents/delivery-reality, /api/agents/technical-feasibility, /api/agents/business-value, /api/agents/security endpoints
25. Update AgentPipeline.jsx — insert 4 specialist agent steps with pause-per-agent + free-text owner response textarea
26. Update debate.js to V2 version — reads specialistFeedback + ownerResponses
27. /api/agents/debate-v2 endpoint (separate from V1 debate to avoid breaking V1)
28. qualityGate.js prompt + /api/agents/quality-gate endpoint
29. Quality Gate UI — hard block modal before Finalise button
30. claudeContext.js prompt + /api/agents/claude-context endpoint
31. stage2Handoff.js prompt
32. /server/assets/rian_theme_reference.html — copy Animation Rate Card HTML here
33. zipBuilder.js — builds zip with 3 files using archiver
34. /api/handoff/stage2 route — calls prompt, reads asset, builds zip, streams download
35. Stage2Handoff.jsx — "Prepare Stage 2 Handoff" button (appears after Finalise), triggers download

---

## What Is NOT In Scope

Do not build these. If asked, refuse and reference this list.

- Database or persistent storage of any kind
- Collaboration features (multi-user editing)
- Asana integration
- Version history UI
- PRD lock / unlock
- Client-facing intake flow
- Audio file transcription
- Mobile responsive layout (desktop only)
- Email notifications
- User settings or preferences
- Stage 3 (external PRD upload + validation) — this is a separate session/mode, spec separately
- Automatic Stage 2 trigger — always manual
- Claude Code API integration inside the web app — Stage 4 is handled externally in VS Code
- Deployment pipeline — Stage 5 is out of scope

---

## Rian Architectural Patterns Reference

When any agent references Rian patterns, use these exact names:

- **Job queue:** `SQS → Lambda → Azure SQL status update` (ref: ImageTranslationJobs table)
- **Media delivery:** `S3 pre-signed URLs with 1-hour expiry` — never through API server
- **Credentials:** `AWS Secrets Manager at rian/{service}/{key}` — never hardcoded
- **ElevenLabs:** `Always silence-strip audio before calling ElevenLabs TTS/STS API — reduces cost ~90%`
- **SQL:** `Never index NVARCHAR(MAX) — use NVARCHAR(450) or less for index keys`
- **Auth:** `HttpOnly, Secure, SameSite=Strict cookies`
- **Real-time:** `SignalR for live events — not WebSockets directly`
- **Frontend:** `Angular 19 (main VOX platform) — PRD Builder uses React, migrated post-POC`
- **Long jobs:** `Lambda max 15-min timeout — Fargate + SQS for files >10min`

---

*Read this file fully before starting.
Build V1 completely and test it before touching V2.
One step at a time. Confirm before advancing.*