# AI Customer Support Coaching Assistant -- Backend Vertical Slice

This is the first working slice of the full system described in the spec:
a **FastAPI backend** implementing the complete **RAG pipeline** and all
**6 AI agents**, running locally with **zero cloud setup** (SQLite +
local ChromaDB + a mock LLM provider), and swappable to Postgres +
Gemini/OpenAI for production with just environment variables.

No frontend yet -- this slice is API-only, built and tested first so the
agent logic is solid before a UI is layered on top.

## What's implemented

- **Auth**: JWT login/register, bcrypt password hashing, role-based access
  control (`agent`, `manager`, `admin`)
- **RAG pipeline**: upload -> load (pdf/docx/txt) -> clean -> recursive chunk
  (500/100) -> sentence-transformer embeddings -> ChromaDB (persistent,
  metadata-filtered, top-K)
- **6 agents**, run in order by an orchestrator on every `/chat` call:
  1. `RetrievalAgent` -- always runs first (RAG safety: never answer without retrieval)
  2. `SentimentAgent` -- positive/neutral/negative/angry/urgent + tone recommendation
  3. `EscalationAgent` -- refund/fraud/legal/technical-escalation detection
  4. `ResponseAgent` -- grounded generation via a configurable LLM provider
  5. `PolicyAgent` -- rejects hallucinated/overpromising responses
  6. `SummaryAgent` -- short internal summary for storage/search
- **Tickets**: create/list/update, status (pending/resolved/escalated/closed)
- **Analytics**: ticket counts, escalation rate, avg confidence, sentiment breakdown
- **Config**: one file (`backend/config.py`), everything overridable via `.env`

## What's NOT built yet (next slices)

- React frontend (all pages)
- Multi-language / voice / CRM & chat integrations (spec's "Future Features")
- Streaming responses, typing indicators
- Fine-grained audit logging UI, feedback UI

## Quick start (local, no API keys, no Docker)

```bash
cd backend
python -m venv venv && source venv/bin/activate   # or your preferred env tool
pip install -r requirements.txt
uvicorn main:app --reload
```

Visit `http://localhost:8000/docs` for interactive Swagger API docs.

By default:
- Database: local SQLite file (`backend/local_app.db`)
- Vector store: local ChromaDB folder (`backend/chroma_data/`)
- LLM: **mock provider** (no key needed) -- returns clearly-labeled mock text
  so you can test the full agent pipeline end-to-end immediately.

## Run the smoke tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

The smoke test registers a user, logs in, and sends a chat message through
all 6 agents, asserting the RAG-safety fallback and escalation detection work.

> **Note:** these files were generated and syntax-checked (`py_compile`) in
> this environment, but this sandbox has no network access, so `pip install`
> and an actual `pytest` run could not be executed here. Please run the
> install + test steps above yourself before relying on this in production --
> if anything doesn't import cleanly, it's most likely a dependency version
> pin in `requirements.txt` that needs a small bump.

## Switching to a real LLM

In `.env` (copy from `.env.example`):

```bash
LLM_PROVIDER=gemini        # or openai
GEMINI_API_KEY=your-key-here
```

No code changes needed -- `llm/provider.py` picks the provider at runtime.

## Switching to Postgres

```bash
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/support_ai
```

## Docker

```bash
docker compose up --build
```

Starts Postgres + the backend together. Uncomment the `DATABASE_URL` line in
`docker-compose.yml` to point the backend at the Postgres container instead
of SQLite.

## API endpoints (this slice)

| Method | Path                 | Auth           | Description                        |
|--------|----------------------|----------------|-------------------------------------|
| POST   | /api/register         | none           | create a user                       |
| POST   | /api/login            | none           | get JWT                             |
| GET    | /api/me               | any            | current user                        |
| POST   | /api/chat             | any            | ask a question, runs all 7 agents   |
| GET    | /api/chat/stream      | any (query token) | same, but streamed via SSE       |
| GET    | /api/history          | any            | search/filter past conversations, or a whole thread |
| GET    | /api/history/export   | any            | export matching conversations as CSV |
| POST   | /api/feedback         | any            | thumbs up/down a conversation       |
| GET    | /api/audit-logs       | admin          | view the audit trail                |
| POST   | /api/upload           | agent+         | upload pdf/docx/txt into RAG        |
| GET    | /api/documents        | any            | list knowledge base documents       |
| DELETE | /api/document/{id}    | manager/admin  | remove a document + its embeddings  |
| POST   | /api/ticket           | any            | create ticket                       |
| GET    | /api/tickets          | any            | list tickets, filter by status      |
| PUT    | /api/ticket/{id}      | any            | update ticket status/priority       |
| GET    | /api/analytics        | manager/admin  | dashboard summary                   |
| GET    | /api/health           | none           | health check                        |

## What's new in this pass (round 2)

- **Rate limiting** -- a dependency-free in-memory sliding-window limiter
  (`utils/rate_limit.py`) on `/login`, `/register` (10/min), and
  `/chat`+`/chat/stream` (30/min). Per-process only -- swap for a
  Redis-backed limiter before running multiple replicas.
- **Audit logging** -- `utils/audit.py` now actually writes to the
  `AuditLog` table on login, registration, document upload/delete, ticket
  status/priority changes, and admin role/active changes. Viewable at
  `GET /api/audit-logs` (admin-only) and in the Admin Panel's new **Audit
  Log** tab.
- **Chat history export** -- `GET /api/history/export` streams a CSV
  (same filters as `/history`: thread, customer, text search). "Export CSV"
  button in the Chat page's history rail triggers a real file download.
  (PDF export is not built -- CSV covers the "export chats" requirement;
  happy to add PDF too if you want both formats.)
- **Language detection** -- an 8th agent, `LanguageAgent` (via `langdetect`),
  tags every conversation with a detected language code, stored and
  returned in `/chat`, `/chat/stream`, and `/history`. Shown as a badge in
  the Chat page when it's not English. Note: this detects the language, it
  does not yet instruct the LLM to *reply* in that language -- that's a
  small follow-on if you want full multi-language support.
- **Markdown rendering** -- AI responses now render as sanitized markdown
  (bold, lists, links, code blocks) via `marked` + `DOMPurify`, with an
  Edit/Preview toggle so you can still edit the raw text before sending.

## What's new in this pass

Building on the vertical slice, this pass adds four of the highest-priority
gaps from the original spec:

- **Conversation memory** -- `/chat` and `/chat/stream` now accept an
  optional `thread_id`. Omit it to start a new thread; pass it back on
  follow-up questions and Coach includes the last 5 turns of that thread as
  context for the response agent, so multi-turn exchanges stay coherent.
  The Chat page groups turns into one scrolling thread with a "New
  conversation" button to start fresh.
- **Streaming responses** -- `GET /api/chat/stream` is a Server-Sent Events
  endpoint that streams the AI response token-by-token, then sends a final
  `done` event with the full metadata (sources, confidence, sentiment,
  escalation, category, priority). The mock provider simulates real
  streaming (word-by-word) so this is fully testable with zero API keys;
  Gemini and OpenAI providers stream from their real SSE APIs. Toggle
  streaming on/off from the Chat page. Note: `EventSource` can't send
  custom headers, so this one endpoint takes the JWT as a `?token=` query
  param instead of an `Authorization` header -- keep this behind HTTPS in
  production.
- **Auto ticket classification + auto priority detection** -- a new
  `ClassificationAgent` (agent #7, rule-based) tags every conversation with
  a category (billing/technical/account/shipping/legal_compliance/general)
  and a priority, escalation-aware. `POST /api/ticket` auto-fills
  priority/category from the linked conversation when not explicitly given.
  Also generates 1-2 follow-up question suggestions, shown as quick-add
  chips under each AI reply on the Chat page.
- **Feedback capture** -- `POST /api/feedback` (already had the DB table,
  now has an endpoint) lets an agent thumbs-up/down any AI suggestion; shown
  inline on each response in the Chat page.

## Frontend

A full React + Tailwind + Material UI frontend now lives in `frontend/`,
covering all 9 pages from the spec: Login, Dashboard, Chat, Ticket
Management, Knowledge Base, Analytics, Admin Panel, Settings, Profile.

### Quick start

```bash
# terminal 1 -- backend (see above)
cd backend && uvicorn main:app --reload

# terminal 2 -- frontend
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. The Vite dev server proxies `/api/*` to
`http://localhost:8000`, so no CORS or env config is needed for local dev.

> **Same network caveat as the backend:** these files were written and
> syntax-checked with `esbuild` in this sandbox (no network access here to
> run `npm install`), but the dev server itself was not run end-to-end.
> Please run `npm install && npm run dev` yourself and let me know if
> anything doesn't come up cleanly -- most likely culprit would be a
> dependency version pin in `package.json`.

### What's implemented

- **Design**: a deliberate visual identity (not MUI/Tailwind defaults) --
  navy sidebar, teal/amber/rose signal colors, Space Grotesk/Inter/IBM Plex
  Mono type system. The signature element is the **citation ledger**: every
  AI reply on the Chat page shows a confidence gauge and a receipt-styled
  list of retrieved sources with similarity scores, making the "never
  guesses" guarantee visible rather than just a backend promise.
- **Login/Register** against the real `/api/login` and `/api/register` endpoints, JWT stored client-side
- **Dashboard**: quick stats + recent conversation feed
- **Chat**: ask a question, see the full agent pipeline result (confidence,
  sentiment, escalation flag, policy flag, citation ledger), edit the
  suggested reply, "send", or save it as a ticket -- plus a searchable
  history rail
- **Tickets**: status tabs, create dialog, inline status updates
- **Knowledge Base**: drag-and-drop upload (pdf/docx/txt), document list with chunk counts, delete
- **Analytics** (manager/admin only): ticket status bar chart, sentiment pie chart, key stats
- **Admin Panel** (admin only): change user roles, activate/deactivate accounts
- **Settings**: live system status (LLM provider, env) + local preferences
- **Profile**: current user info

### What's not built yet

- Streaming AI responses / typing indicator
- Dark mode toggle (structurally easy to add given the token system, just not wired up)
- Real "send to customer" delivery channel (email/chat integration) -- currently just marks the reply as sent in the UI
- Password change / profile editing flows

## Suggested next slice

Both major pieces (API + UI) now exist end-to-end. From here, good next
steps: (a) run both together locally and fix anything that breaks on first
contact, (b) add streaming responses so the Chat page feels real-time, or
(c) the "Future Features" list (voice, CRM/Slack/WhatsApp integrations).
Happy to build any of these next.
