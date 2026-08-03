"""
Central application configuration.

Everything here has a safe local default so the app runs out of the box
with `docker compose up` or `uvicorn main:app` with NO cloud accounts,
API keys, or external Postgres instance required.

To go to production:
  - set DATABASE_URL to a real Postgres URL
  - set LLM_PROVIDER to "gemini" or "openai" and supply the matching key
  - set JWT_SECRET_KEY to a long random value
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "AI Customer Support Coaching Assistant"
    ENV: str = "local"  # local | staging | production

    # --- Database ---
    # Defaults to a local SQLite file so the project runs with zero setup.
    # Swap in a real Postgres URL in production, e.g.:
    # postgresql+psycopg2://user:password@host:5432/support_ai
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'local_app.db'}"

    # --- Vector store (ChromaDB) ---
    CHROMA_PERSIST_DIR: str = str(BASE_DIR / "chroma_data")
    CHROMA_COLLECTION: str = "company_knowledge"

    # --- Embeddings ---
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # --- Chunking ---
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 4

    # --- LLM provider ---
    # "gemini" | "openai" | "mock"
    # "mock" needs no API key at all and is the default so the full agent
    # pipeline is testable immediately; switch to "gemini"/"openai" for real answers.
    LLM_PROVIDER: str = "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"


    # --- Auth ---
    JWT_SECRET_KEY: str = "dev-secret-change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # --- Uploads ---
    UPLOAD_DIR: str = str(BASE_DIR / "uploaded_files")
    MAX_UPLOAD_MB: int = 20


settings = Settings()

Path(settings.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
