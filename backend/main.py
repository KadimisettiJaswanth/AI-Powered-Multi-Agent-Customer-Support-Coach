from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database.db import init_db
from api import routes_auth, routes_chat, routes_upload, routes_tickets, routes_analytics, routes_feedback, routes_coaching

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Real-Time Customer Support Coaching Assistant -- RAG + Multi-Agent backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production to your frontend origin(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "env": settings.ENV, "llm_provider": settings.LLM_PROVIDER}


# All routes are mounted under /api to match the spec's endpoint list
# (POST /login, POST /register, POST /chat, POST /upload, GET /history, etc.)
app.include_router(routes_auth.router, prefix="/api")
app.include_router(routes_chat.router, prefix="/api")
app.include_router(routes_upload.router, prefix="/api")
app.include_router(routes_tickets.router, prefix="/api")
app.include_router(routes_analytics.router, prefix="/api")
app.include_router(routes_feedback.router, prefix="/api")
app.include_router(routes_coaching.router)

