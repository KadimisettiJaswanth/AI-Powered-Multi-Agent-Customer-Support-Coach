from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# --- Auth ---
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(min_length=8)
    role: str = "agent"  # agent | manager | admin


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool = True

    class Config:
        from_attributes = True


# --- Chat / RAG ---
class ChatRequest(BaseModel):
    question: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    thread_id: Optional[str] = None  # omit to start a new conversation thread


class SourceChunk(BaseModel):
    document_name: str
    chunk_id: str
    text_snippet: str
    score: float


class ChatResponse(BaseModel):
    conversation_id: str
    thread_id: str
    ai_response: str
    confidence_score: float
    sources: List[SourceChunk]
    sentiment: str
    escalation_recommended: bool
    escalation_reason: Optional[str] = None
    policy_flagged: bool
    policy_notes: Optional[str] = None
    summary: str
    suggested_tone: str
    category: str
    priority: str
    follow_up_suggestions: List[str] = []
    language_code: str = "en"
    language_name: str = "English"


# --- Tickets ---
class TicketCreate(BaseModel):
    subject: str
    description: Optional[str] = None
    customer_id: Optional[str] = None
    conversation_id: Optional[str] = None
    priority: Optional[str] = None  # omit to auto-detect from the linked conversation
    category: Optional[str] = None  # omit to auto-detect from the linked conversation


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None


class TicketOut(BaseModel):
    id: str
    subject: str
    description: Optional[str]
    status: str
    priority: str
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Feedback ---
class FeedbackCreate(BaseModel):
    conversation_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: str
    conversation_id: Optional[str]
    rating: Optional[int]
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Knowledge base ---
class DocumentOut(BaseModel):
    id: str
    filename: str
    file_type: str
    chunk_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Audit ---
class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str]
    action: str
    detail: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Analytics ---
class AnalyticsSummary(BaseModel):
    total_tickets: int
    pending_tickets: int
    resolved_tickets: int
    escalated_tickets: int
    closed_tickets: int
    total_conversations: int
    avg_confidence_score: float
    escalation_rate: float
    sentiment_breakdown: dict
