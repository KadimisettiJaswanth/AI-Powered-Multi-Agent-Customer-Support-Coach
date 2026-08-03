"""
ORM models. Kept intentionally normalized but simple -- this is the
persistence layer for the vertical slice (auth + RAG + agents + tickets).
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from database.db import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    agent = "agent"
    manager = "manager"
    admin = "admin"


class TicketStatus(str, enum.Enum):
    pending = "pending"
    resolved = "resolved"
    escalated = "escalated"
    closed = "closed"


class SentimentLabel(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"
    angry = "angry"
    urgent = "urgent"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.agent)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="agent")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    email = Column(String, index=True, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="customer")
    tickets = relationship("Ticket", back_populates="customer")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf | docx | txt
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=True)
    chunk_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    """One customer question + AI/agent answer turn."""
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    thread_id = Column(String, index=True, nullable=True)  # groups turns into one ongoing conversation
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    agent_id = Column(String, ForeignKey("users.id"), nullable=True)

    question = Column(Text, nullable=False)
    ai_suggested_response = Column(Text, nullable=True)
    final_response = Column(Text, nullable=True)  # after human edit/send

    retrieved_context = Column(Text, nullable=True)  # joined chunk text, for audit/citation
    source_documents = Column(Text, nullable=True)  # JSON string list of doc names/chunk ids

    sentiment = Column(Enum(SentimentLabel), nullable=True)
    escalation_recommended = Column(Boolean, default=False)
    escalation_reason = Column(String, nullable=True)
    policy_flagged = Column(Boolean, default=False)
    policy_notes = Column(String, nullable=True)
    auto_category = Column(String, nullable=True)   # billing | technical | account | general | ...
    auto_priority = Column(String, nullable=True)    # low | normal | high | urgent
    language = Column(String, nullable=True)         # ISO 639-1 code, e.g. "en", "es", "fr"
    confidence_score = Column(Float, nullable=True)
    summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="conversations")
    agent = relationship("User", back_populates="conversations")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, default=gen_uuid)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)  # billing | technical | account | general | ...
    status = Column(Enum(TicketStatus), default=TicketStatus.pending)
    priority = Column(String, default="normal")  # low | normal | high | urgent
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="tickets")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class CoachingSession(Base):
    __tablename__ = "coaching_sessions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    mode = Column(String, nullable=False, default="simulator")  # simulator | manual | replay
    scenario_id = Column(String, nullable=True)
    scenario_title = Column(String, nullable=True)
    product_context = Column(Text, nullable=True)
    customer_persona = Column(Text, nullable=True)
    status = Column(String, default="active")  # active | completed
    resolution_score = Column(Float, nullable=True)
    summary_report = Column(Text, nullable=True)  # JSON blob with final metrics & tips
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    turns = relationship("SessionTurn", back_populates="session", cascade="all, delete-orphan")


class SessionTurn(Base):
    __tablename__ = "session_turns"

    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, ForeignKey("coaching_sessions.id"), nullable=False)
    turn_index = Column(Integer, nullable=False)
    customer_message = Column(Text, nullable=False)
    agent_message = Column(Text, nullable=True)

    intent = Column(String, nullable=True)
    sentiment = Column(String, nullable=True)  # positive | neutral | negative | angry | urgent
    frustration_level = Column(Float, default=0.0)  # 0 to 100
    satisfaction_trend = Column(String, default="stable")  # improving | stable | worsening

    escalation_score = Column(Float, default=0.0)  # 0 to 100
    is_high_risk = Column(Boolean, default=False)
    escalation_reason = Column(Text, nullable=True)
    escalation_recommendation = Column(Text, nullable=True)

    suggested_response = Column(Text, nullable=True)
    tone_clarity_score = Column(Float, default=80.0)
    coaching_tips = Column(Text, nullable=True)  # JSON array

    retrieved_knowledge = Column(Text, nullable=True)  # JSON array of retrieved docs

    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("CoachingSession", back_populates="turns")

