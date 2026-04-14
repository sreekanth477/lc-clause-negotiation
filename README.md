# LC Clause Negotiation AI Copilot

An AI-powered trade finance application for bank-side Trade RMs and Issuance Officers to analyse, negotiate, and generate scrutiny reports for Letters of Credit under UCP 600.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     LC Copilot – System Architecture            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Browser (React 18 + Vite + Tailwind)                         │
│   ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐ │
│   │  Dashboard   │  │ ClauseReview  │  │ ComplianceDashboard │ │
│   │  NewLCReview │  │ ScrutinyReport│  │ (OFFICER/ADMIN)    │ │
│   └──────┬───────┘  └───────┬───────┘  └────────────────────┘ │
│          │    Axios + SSE   │                                   │
│          ▼                  ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │             Express API (Node.js 20 + TypeScript)       │  │
│   │                                                         │  │
│   │  /api/auth     → JWT authentication                     │  │
│   │  /api/lc/      → LC Session management + SSE analysis   │  │
│   │  /api/clauses  → Decisions, escalations, feedback       │  │
│   │  /api/compliance → Compliance dashboard                 │  │
│   └──────┬──────────────────────────────────┬──────────────┘  │
│          │                                  │                  │
│          ▼                                  ▼                  │
│   ┌──────────────┐                  ┌──────────────────────┐  │
│   │  AI Agents   │                  │   PostgreSQL 15       │  │
│   │              │                  │   + pgvector          │  │
│   │  ┌─────────┐ │                  │                       │  │
│   │  │ Parser  │ │                  │  LCSession            │  │
│   │  │ Risk    │◄├──── RAG ─────────┤  Clause              │  │
│   │  │ Wording │ │  (UCP 600 +      │  Alternative         │  │
│   │  │ Report  │ │   ISBP 821)      │  OfficerDecision     │  │
│   │  └─────────┘ │                  │  AuditLog            │  │
│   │  Anthropic   │                  │  ApiUsageLog         │  │
│   │  Claude API  │                  │  KnowledgeChunk      │  │
│   └──────────────┘                  └──────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|--------------------------------------------------------|
| Frontend    | React 18, Vite, TypeScript, Tailwind CSS, Zustand      |
| Backend     | Node.js 20, Express, TypeScript                        |
| Database    | PostgreSQL 15 + pgvector extension (via Prisma ORM)    |
| AI Engine   | Anthropic Claude API (`claude-sonnet-4-20250514`)      |
| Auth        | JWT (jsonwebtoken) with role-based access control      |
| PDF Export  | Puppeteer                                              |
| DOCX Export | docx npm library                                       |
| Testing     | Vitest + Supertest                                     |
| Monorepo    | pnpm workspaces                                        |

---

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **pnpm 8+** — `npm install -g pnpm`
- **PostgreSQL 15** — with `pgvector` extension
- **Anthropic API Key** — [console.anthropic.com](https://console.anthropic.com)

### Enable pgvector in PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example packages/backend/.env
```

Edit `packages/backend/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/lc_copilot
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=8h
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
MAX_FILE_SIZE_MB=10
VECTOR_DIMENSIONS=1536
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

This runs `prisma migrate dev` and creates all tables including `vector(1536)` columns.

### 4. Seed the database

```bash
pnpm db:seed
```

Seeds:
- UCP 600 (Articles 1–39) + ISBP 821 knowledge chunks into pgvector store
- 3 demo users (see credentials below)
- 1 demo LC session with 8 diverse clauses

### 5. Start the application

```bash
pnpm dev
```

This starts both frontend and backend concurrently:
- Backend API: `http://localhost:3001`
- Frontend:    `http://localhost:5173`

---

## Demo Credentials

| Role               | Email                  | Password    |
|--------------------|------------------------|-------------|
| Trade RM           | trade.rm@bank.com      | password123 |
| Compliance Officer | compliance@bank.com    | password123 |
| Admin              | admin@bank.com         | password123 |

---

## Key API Endpoints

### Authentication

```
POST   /api/auth/login          → { token, user }
POST   /api/auth/refresh        → { token }
```

### LC Sessions

```
POST   /api/lc/sessions                        → Create session
GET    /api/lc/sessions?status=&page=&limit=   → List sessions (paginated)
GET    /api/lc/sessions/:id                    → Get full session
POST   /api/lc/sessions/:id/parse              → Parse raw LC text into clauses
POST   /api/lc/sessions/:id/analyse            → SSE: stream risk analysis per clause
PATCH  /api/lc/sessions/:id/status             → Update session status
GET    /api/lc/sessions/:id/report             → Generate scrutiny report
GET    /api/lc/sessions/:id/export/pdf         → Download PDF report
GET    /api/lc/sessions/:id/export/docx        → Download DOCX report
```

### Clauses

```
POST   /api/clauses/:id/decision   → Record officer decision
POST   /api/clauses/:id/escalate   → Escalate clause to compliance
POST   /api/clauses/:id/feedback   → Submit AI feedback rating
```

### Compliance (COMPLIANCE_OFFICER / ADMIN only)

```
GET    /api/compliance/dashboard                  → Full dashboard data
POST   /api/compliance/escalations/:id/resolve    → Resolve escalation
```

---

## Role-Based Access

| Feature                     | TRADE_RM | COMPLIANCE_OFFICER | ADMIN |
|-----------------------------|----------|--------------------|-------|
| Create LC session           | ✓        | ✓                  | ✓     |
| View own sessions           | ✓        | ✓                  | ✓     |
| View all sessions           | ✗        | ✓                  | ✓     |
| Analyse clauses             | ✓        | ✓                  | ✓     |
| Record officer decisions    | ✓        | ✓                  | ✓     |
| Escalate clauses            | ✓        | ✓                  | ✓     |
| Resolve escalations         | ✗        | ✓                  | ✓     |
| Compliance dashboard        | ✗        | ✓                  | ✓     |
| Export PDF/DOCX             | ✓        | ✓                  | ✓     |

---

## AI Agents

| Agent              | Model                        | Temperature | Purpose                               |
|--------------------|------------------------------|-------------|---------------------------------------|
| clauseParser       | claude-sonnet-4-20250514     | 0.1         | Segment LC text into typed clauses    |
| riskAnalyser       | claude-sonnet-4-20250514     | 0.2         | Assess UCP 600 compliance + risk      |
| wordingGenerator   | claude-sonnet-4-20250514     | 0.4         | Propose ICC-aligned alternatives      |
| reportGenerator    | claude-sonnet-4-20250514     | 0.3         | Generate formal scrutiny reports      |

All agent calls are logged to the `ApiUsageLog` table with model, token count, latency, and clause/session IDs.

---

## Adding New Bank Rules

Edit `packages/backend/src/rules/bankRules.config.json`:

```json
{
  "rules": [
    {
      "id": "RULE_007",
      "name": "My New Rule",
      "description": "Description of what this rule checks for",
      "severity": "HIGH",
      "patterns": [
        "literal phrase to match",
        "regex [0-9]+ pattern"
      ]
    }
  ]
}
```

Patterns support both:
- **Literal strings** — case-insensitive substring match
- **Regex patterns** — passed to `new RegExp(pattern, 'i')`

The rules engine runs before every Claude API call, injecting matched rules into the risk analyser prompt.

---

## SSE Streaming Flow

The `/api/lc/sessions/:id/analyse` endpoint streams analysis results via Server-Sent Events:

```
Client                           Server
  |                                |
  |-- POST /analyse ─────────────→|
  |                                | (for each clause)
  |← data: { clauseId, analysis, alternatives } --|
  |← data: { clauseId, analysis, alternatives } --|
  |← data: { clauseId, analysis, alternatives } --|
  |← data: { type: "COMPLETE" } ------------------|
```

Frontend uses `EventSource` in the `useClauseReview` hook to update the Zustand store in real-time as each clause is analysed.

---

## Project Structure

```
lc-copilot/
├── packages/
│   ├── shared/          # TypeScript types, Zod schemas, enums
│   ├── backend/
│   │   └── src/
│   │       ├── agents/  # Claude AI agent functions
│   │       ├── rag/     # pgvector embeddings + UCP 600 seed
│   │       ├── rules/   # Bank rules engine
│   │       ├── routes/  # Express route handlers
│   │       ├── middleware/  # Auth, audit, error handling
│   │       ├── services/    # Business logic
│   │       └── prisma/      # Schema + seed script
│   └── frontend/
│       └── src/
│           ├── pages/       # Route-level page components
│           ├── components/  # Reusable UI components
│           ├── hooks/       # Custom React hooks
│           ├── store/       # Zustand state management
│           └── api/         # Axios API client
├── pnpm-workspace.yaml
└── .env.example
```
