# AI-Powered Multi-Agent Customer Support Coach

A comprehensive, enterprise-ready AI platform designed to provide real-time coaching for customer support agents. This system uses a **Multi-Agent Orchestrator** to analyze live customer interactions, retrieve knowledge from documents using RAG, monitor sentiment, flag policy violations, and simulate customer interactions for agent training.

## 🚀 Key Features

### 1. Multi-Agent Orchestrator (10 Specialized AI Agents)
Instead of relying on a single monolithic prompt, this system distributes tasks across a pipeline of specialized agents:
- **RetrievalAgent (RAG)**: Connects to local ChromaDB to pull precise context from your uploaded Knowledge Base.
- **SentimentAgent**: Analyzes emotional state, frustration levels, and customer intent.
- **PolicyAgent**: Checks proposed responses against strict company policies.
- **EscalationAgent**: Automatically flags tickets for human escalation based on sentiment spikes or policy risks.
- **ClassificationAgent**: Auto-categorizes support queries and detects priority levels.
- **ResponseAgent**: Drafts grounded, perfectly-toned responses for human agents to review and send.
- **CoachingAgent**: Evaluates human agent responses and provides a "Tone & Clarity" score along with actionable improvement tips.
- **LanguageAgent**: Auto-detects customer language.
- **CustomerSimulatorAgent**: Powers the Coaching Console by simulating dynamic, diverse customer personas (e.g., "Angry customer double billed") that react to the human agent's input in real time.

### 2. Premium "Glassmorphic" UI
- Built with **React**, **Vite**, and **Tailwind CSS**.
- Features a highly polished, translucent glassmorphic design system over a strictly enforced enterprise color palette (Ink, Navy, Teal, Amber, Rose).
- Full suite of pages: Dashboard, Live Chat, Ticket Management, Knowledge Base, Analytics, Admin Panel, Settings, and Profile.

### 3. Real-Time Analytics & Coaching Console
- **Analytics Dashboard**: Live donut charts and bar graphs (powered by Recharts) showing total ticket volume, escalation rates, and a detailed customer sentiment breakdown.
- **Three-Panel Coaching Console**: A dedicated simulator view where managers can configure scenarios and trainees can practice handling highly realistic, AI-simulated customers with text-to-speech voice support.

### 4. Fully Local / Zero-Cloud Option
- Runs entirely locally out of the box using **SQLite** for the database, **ChromaDB** for vector storage, and a built-in mock LLM provider.
- Instantly switch to production mode using **PostgreSQL** and real external LLM providers (**Gemini** or **OpenAI**) by simply updating environment variables.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python), SQLAlchemy, Passlib (bcrypt JWT auth), sentence-transformers (all-MiniLM-L6-v2), ChromaDB.
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Context API.
- **Infrastructure**: Docker Compose ready (for seamless Postgres + FastAPI + Nginx deployment).

---

## 🚦 Quick Start Guide

### Option A: Local Development (Without Docker)

**1. Start the Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```
*The backend runs on `http://127.0.0.1:8000`. Swagger API docs are available at `/docs`.*

**2. Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*The frontend runs on `http://localhost:5173`. Vite automatically proxies `/api` calls to the backend.*

### Option B: Docker Compose
Run the entire stack (including PostgreSQL) with a single command:
```bash
docker compose up --build
```

---

## 🔧 Configuration (.env)

You can easily switch the LLM provider from the local mock to a real AI model by copying `backend/.env.example` to `backend/.env` and modifying it:

```env
# Choose between: mock, gemini, or openai
LLM_PROVIDER=gemini 
GEMINI_API_KEY=your_google_gemini_key_here

# For production database (uncomment to switch from SQLite to Postgres)
# DATABASE_URL=postgresql+psycopg2://user:password@host:5432/support_ai
```

---

## 🛡️ Security & Features Built-In
- **Role-Based Access Control**: Strict `agent`, `manager`, and `admin` roles controlling access to Analytics, Knowledge Base uploads, and Admin panels.
- **Profile Self-Service**: Users can safely update their profiles and passwords directly from the UI.
- **Audit Logging**: Sensitive actions (logins, role changes, document deletions) are permanently recorded in the database and viewable via the Admin UI.
- **Rate Limiting**: Built-in sliding-window rate limiters defend against brute-force logins and API spam.
