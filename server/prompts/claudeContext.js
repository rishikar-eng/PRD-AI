/**
 * SPEC: getClaudeContextPrompt
 * Purpose: Generates a CLAUDE.md implementation brief for Claude Code
 * This is the handoff from PRD Pipeline → Claude Code in VS Code
 * Output must look like a real CLAUDE.md — folder structure, build order,
 * hard rules, endpoints, session state — not generic headings
 */
export function getClaudeContextPrompt(finalPRD, agentFeedback, ownerResponses, mockupsDescription) {
  return `You are generating a CLAUDE.md file that Claude Code will read before building a feature for Rian.

WHAT CLAUDE.md IS:
It is the single source of truth for a Claude Code session building one specific feature.
It must be specific enough that Claude Code can start writing files immediately without asking questions.
It is NOT a summary. It is NOT a generic brief. It IS an executable spec.

Look at this example of a real Rian CLAUDE.md for reference on tone, specificity, and structure:

---
# Rian PRD Pipeline — CLAUDE.md

## What You Are Building
One paragraph. Specific problem, specific user, specific outcome.

## Stack
| Layer | Technology |
|---|---|
| Frontend | Angular 19 |
| Backend | .NET C# (RianAPI) |
...

## Project Structure
\`\`\`
/feature-name
  /client (if Angular component)
    component-name.component.ts
    component-name.component.html
    component-name.component.scss
  /server (if new API endpoint)
    /Controllers
      FeatureController.cs
    /Services
      IFeatureService.cs
      FeatureService.cs
    /Models
      FeatureJob.cs
\`\`\`

## API Endpoints
POST /api/feature/start
Body: { fileId, config }
Returns: { jobId, status }

## Database Schema
Table: FeatureJobs
Columns: jobId (UNIQUEIDENTIFIER), fileId (NVARCHAR(450)), status (NVARCHAR(50)), createdAt (DATETIME2)
Index: ON fileId — NVARCHAR(450) NOT MAX

## Hard Rules — Never Violate
- [ ] ElevenLabs: silence-strip audio before every TTS/STS call
- [ ] S3: pre-signed URLs only (1hr expiry) — never public, never through API server
- [ ] Secrets: AWS Secrets Manager at rian/{service}/{key} — never hardcoded
- [ ] SQL: NVARCHAR(450) max for index keys — never NVARCHAR(MAX)
- [ ] Lambda: 15-min max timeout — use Fargate + SQS for files >10min

## Build Order
1. Database migration — create FeatureJobs table
2. IFeatureService interface + FeatureService implementation
3. FeatureController with POST /api/feature/start endpoint
4. SQS job push from controller
5. Lambda handler reading from SQS
...

## What NOT to Build
- No client-facing UI in v1
- No bulk operation support
- No email notifications
---

That is the style. Now generate a CLAUDE.md for the specific feature described below.

RIAN STACK (always reference these by exact name in the output):
- Frontend: Angular 19 (VOX platform), React/Vite (new subdomains)
- Backend: .NET C# (RianAPI)
- Infrastructure: AWS Lambda (15-min max), Fargate (long jobs), SQS job queues, CloudFront, WAF
- Database: Azure SQL
- AI/TTS: ElevenLabs TTS/STS — MANDATORY silence-strip before every call
- Storage: S3 pre-signed URLs (1hr expiry) — never serve media through API server
- Secrets: AWS Secrets Manager at rian/{service}/{key} — never hardcoded, never in .env on EC2
- Real-time: SignalR
- Job pattern: SQS → Lambda → Azure SQL status update (ref: ImageTranslationJobs table pattern)
- Auth: HttpOnly, Secure, SameSite=Strict cookies
- SQL rule: NVARCHAR(450) max for index keys — never NVARCHAR(MAX)

RIAN HARD RULES (must appear as unchecked checklist in Architecture Requirements):
1. ElevenLabs: silence-strip audio before every TTS/STS API call — reduces cost ~90%
2. S3: pre-signed URLs only (1hr expiry) — never public S3 URLs, never served through API server
3. Secrets Manager: all API keys at rian/{service}/{key} — never hardcoded or in .env on EC2
4. SQL: NVARCHAR(450) max for any indexed column — never NVARCHAR(MAX)
5. Lambda: 15-min max timeout — specify Fargate + SQS path for any job that could exceed this

INPUTS:

Final PRD:
${finalPRD}

Specialist Agent Feedback and Owner Decisions:
${JSON.stringify(agentFeedback, null, 2)}

Owner Responses to Each Agent:
${JSON.stringify(ownerResponses, null, 2)}

${mockupsDescription ? `UI Mockup Reference:\n${mockupsDescription}` : ''}

GENERATE THIS EXACT STRUCTURE — populate every section with feature-specific content:

# [Feature Name] — CLAUDE.md
# Read this entire file before writing a single line of code.

---

## What You Are Building
[One focused paragraph. Specific problem from PRD Objective section.
Specific user type (AD writer / QC vendor / delivery coordinator / project manager).
Specific outcome. The measurable success metric from the PRD.]

---

## Stack
[Table of layers and technologies. Only include layers this feature actually touches.
If it is a backend-only feature, omit frontend row. Be precise about which Angular module or
which .NET service is involved — not just "Angular 19".]

---

## Project Structure
[Actual file tree with real file names based on the feature.
Follow Rian naming conventions: .NET C# for backend (PascalCase), Angular for frontend.
Include every file Claude Code will create:
  - Controller (.cs)
  - Service interface (IFeatureService.cs)
  - Service implementation (FeatureService.cs)
  - Model/DTO (.cs)
  - Azure SQL migration script (.sql)
  - SQS Lambda handler (.cs) if async job
  - Angular component files (.ts, .html, .scss) if frontend
  - Any new route or module registration needed]

---

## API Endpoints
[Every endpoint this feature requires. For each:
  Method + full path
  Request body: exact field names, types, required/optional
  Response body: exact shape
  Auth: cookie-based (standard) or open
  Sync or async (does it push to SQS or return immediately)]

---

## Database Schema
[Every new table or column. For each table:
  Table name (PascalCase)
  Column: name (type, constraints)
  Explicitly state NVARCHAR length — never write NVARCHAR(MAX) for indexed columns
  Index definition
  Foreign key constraints if any
Reference the ImageTranslationJobs table as the pattern to follow.]

---

## Job Queue Pattern
[Only include if feature uses SQS + Lambda.
State:
  What triggers the SQS push (which controller action)
  SQS message payload shape
  Lambda function name and what it does
  Status values written to Azure SQL (Pending / Processing / Completed / Failed)
  Retry count and dead-letter queue behaviour
  What the frontend polls or receives via SignalR]

---

## Architecture Requirements
[The 5 Rian hard rules as unchecked checkboxes PLUS
feature-specific constraints from the PRD Architecture Constraints section
AND any Technical Feasibility concerns the owner accepted.
Every item is a checkbox Claude Code must verify before shipping:
- [ ] ElevenLabs: silence-strip before every TTS/STS call
- [ ] S3: pre-signed URLs only (1hr expiry) — never public
- [ ] AWS Secrets Manager at rian/{service}/{key} — never hardcoded
- [ ] NVARCHAR(450) max for all indexed columns
- [ ] Lambda 15-min max — [state Fargate path if this feature needs it]
- [ ] [feature-specific constraint from PRD]
- [ ] [constraint from accepted Technical Feasibility concern]]

---

## Decisions Made During Agent Review
[Concrete implementation decisions only — not commentary.
Omit rejected concerns, soft warnings, and anything without a clear decision.
Format:
**[Agent]** flagged: [specific concern]
**Decision**: [what owner said]
**Must implement**: [exact thing Claude Code does differently as a result]]

---

## Open Questions — Blocks These Sections
[Open Questions from PRD that are still unanswered.
Format:
❓ [exact question]
Blocks: [Controller action / DB column / Lambda logic] — do not write this code until resolved]

---

## Build Order
[Numbered steps. Each step names the actual file being created or modified.
Never write "set up the project" — write "create FeatureService.cs implementing IFeatureService".
Never write "add the endpoint" — write "add POST /api/feature/start to FeatureController.cs".
Order:
1. Azure SQL migration — create [TableName] table
2. Model class — [ModelName].cs
3. IFeatureService interface
4. FeatureService implementation
5. FeatureController — register in Program.cs
6. SQS push from controller (if async)
7. Lambda handler (if async)
8. Angular component + route registration (if frontend)
9. SignalR event emission on job completion (if real-time)
10. End-to-end test — [specific test scenario from Acceptance Criteria]]

---

## Acceptance Criteria
[All 15+ binary [ ] statements from PRD Acceptance Criteria, copied verbatim.
Do not summarise. Do not reword. Copy exactly.
These are the done conditions — every one must pass before shipping.]

---

## What NOT to Build
[Out of Scope from PRD, copied verbatim.
Plus scope creep flagged by agents that owner confirmed is out of scope.
Be explicit — name what NOT to do, not just what to do.]

---

## Success Metric
[Exact text from PRD Success Metric section, copied verbatim.
This is how we know the feature worked.]

---

*Read this file fully before starting.
One step at a time. Confirm before advancing.*

OUTPUT FORMAT:
Return ONLY the markdown. No JSON. No preamble. No meta-commentary about what you generated.
Start directly with: # [Feature Name] — CLAUDE.md`;
}