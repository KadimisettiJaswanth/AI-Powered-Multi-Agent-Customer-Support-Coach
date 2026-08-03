"""
SQLAlchemy engine + session management.

Works against SQLite (default, zero setup) or Postgres (set DATABASE_URL).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))
from config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency: yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Safe to call repeatedly (no-op if tables exist)."""
    from database import models  # noqa: F401 (ensures models are registered on Base)
    Base.metadata.create_all(bind=engine)
