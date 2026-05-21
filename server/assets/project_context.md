# Rian Project Context

> This file is loaded by the AI agents (writer + 4 specialists) on every run.
> Edit it to update what the agents know about Rian's tech stack, conventions,
> and previous work. **No restart needed** — agents pick up your edits on their
> next call.

---

## Tech Stack

### Frontend
- **VOX platform (main):** Angular 19
- **PRD Pipeline + newer subdomains:** React 18 + Vite
- **Styling:** CSS custom properties (Rian brand system — pink/orange/green gradient, Plus Jakarta Sans, dark theme)

### Backend
- **API:** .NET C# (RianAPI)
- **Auth:** HttpOnly, Secure, SameSite=Strict cookies via Rian Auth
- **Database:** Azure SQL (primary), Supabase Postgres (PRD Pipeline only)
- **Real-time:** SignalR (preferred over raw WebSockets)

### Infrastructure
- **Compute:** AWS Lambda (short jobs), Fargate (long jobs > 10 min)
- **Queues:** SQS — standard pattern is `SQS → Lambda → Azure SQL status update`
- **Storage:** S3 with pre-signed URLs (1-hour expiry) — never serve media through API server
- **CDN:** CloudFront + WAF
- **Secrets:** AWS Secrets Manager at `rian/{service}/{key}` — never hardcoded, never in `.env` on EC2

### AI / Media
- **TTS / STS:** ElevenLabs — silence-strip audio before every API call (mandatory; reduces cost ~90%)
- **LLM:** OpenAI gpt-4o (most agents), Anthropic Claude Sonnet 4.6 (debate agent only)
- **OCR / DTP:** Azure Document Intelligence
- **Generic AI:** Gemini for specific image / multimodal tasks

---

## Hard Architectural Rules

Every PRD must respect these. Mention them in Architecture Constraints when relevant:

1. **ElevenLabs cost:** always silence-strip audio before TTS/STS API calls.
2. **Media delivery:** S3 pre-signed URLs (1-hour expiry), never through API server.
3. **Secrets:** AWS Secrets Manager only — no hardcoded keys.
4. **SQL indexes:** never index `NVARCHAR(MAX)`. Use `NVARCHAR(450)` or less for index keys.
5. **Lambda timeout:** 15-minute cap. Files / jobs longer than 10 min need Fargate + SQS.

---

## User Types

When PRDs reference users, use these exact terms:

- **AD writers** — audio description professionals; work in batches; tight deadlines.
- **QC vendors** — quality control teams; fixed workflows; resistant to new tools.
- **Delivery coordinators** — manage S3 uploads, client portals, format conversions.
- **Project managers** — track jobs, assign work, manage client communication.
- **Internal ops** — Sumant Jamdar's team (delivery / operations).

---

## Domain Glossary

- **AD** — audio description
- **VOX** — Rian's main media-localization platform
- **STS** — speech-to-speech (ElevenLabs voice cloning)
- **TTS** — text-to-speech
- **DTP** — desktop publishing (used after OCR translation for layout preservation)
- **PRD Pipeline** — this app

---

## Previous PRDs

> Add a short summary for each completed PRD. Agents read this to avoid
> repeating prior work, reference past decisions, and stay consistent across
> features. Keep entries terse — one paragraph each.

### (None yet — populate as PRDs are finalised)

<!--

Example entry:

### Auto-AD Script Generation
- **Problem:** AD writers spent 45 min per episode manually cleaning script timing.
- **Solution:** Auto-detect silence gaps in video, pre-populate AD script.
- **Outcome:** Cut cleanup time from 45 min → 15 min per episode.
- **Completed:** 2026-04-15
- **Owner:** Ojas (Product)
- **Notes for future PRDs:** Used silence-strip pre-processing; reuse this for any feature touching audio. Lambda-based; ran inside 15-min cap.

-->
