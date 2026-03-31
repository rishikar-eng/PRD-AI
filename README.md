# Rian PRD Pipeline V1

AI-powered 6-stage PRD generation system for Rian.io

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

This will install dependencies for the root, client, and server.

### 2. Configure Environment

Create a `.env` file in the `server/` directory:

```bash
cp .env.example server/.env
```

Edit `server/.env` and add your API keys:

```env
OPENAI_API_KEY=your-openai-key-here
RIAN_API_BASE_URL=https://api.rian.io/v1
PORT=3001
NODE_ENV=development
SESSION_SECRET=your-random-secret-string-here
CORS_ORIGIN=http://localhost:3000
```

### 3. Run Development Servers

```bash
npm run dev
```

This starts both:
- Frontend (React + Vite) on http://localhost:3000
- Backend (Node.js + Express) on http://localhost:3001

## Architecture

### Frontend (React 18)
- `/client/src/components/` - All React components
- `/client/src/styles/` - CSS with Rian design system

### Backend (Node.js + Express)
- `/server/routes/` - API endpoints
- `/server/prompts/` - AI agent system prompts
- `/server/services/` - Shared services (AI client)
- `/server/middleware/` - Auth & session middleware

## The 6 Stages

1. **Idea Capture** - User inputs feature idea (one-liner/notes/upload) + selects role
2. **AI Intake** - Conversational interview to gather requirements (max 6 turns)
3. **Writer Agent** - Generates full PRD with streaming output
4. **QC Agent** - Reviews PRD, scores it, produces constructive comments
5. **Debate Agent** - Adversarial review (escalates if QC scores < 2.5)
6. **Owner Review** - Side-by-side PRD + comments with Accept/Reject/Edit actions

## Authentication

Uses existing Rian API authentication:
- Login: `POST /api/auth/login` - email/password
- Refresh: `POST /api/auth/refresh` - refresh tokens
- Session: Server-side session storage with HttpOnly cookies

## API Endpoints

### Auth
- `POST /api/auth/login` - Login with Rian credentials
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/me` - Get current user

### Intake (Stage 2)
- `POST /api/intake/start` - Start intake conversation
- `POST /api/intake/reply` - Continue conversation

### Agents (Stages 3-5)
- `POST /api/agents/writer` - Generate PRD (SSE stream)
- `POST /api/agents/qc` - QC review
- `POST /api/agents/debate` - Debate review

## V1 Limitations

- No database - all state is in-memory (server session)
- No collaboration features
- No Asana integration
- Desktop only (not mobile responsive)
- Session data is lost on server restart

## Tech Stack

- **Frontend**: React 18, Vite
- **Backend**: Node.js, Express
- **AI**: OpenAI gpt-4o
- **Auth**: Rian API (api.rian.io/v1)
- **State**: In-memory session storage
- **Styling**: CSS custom properties (Rian brand)
