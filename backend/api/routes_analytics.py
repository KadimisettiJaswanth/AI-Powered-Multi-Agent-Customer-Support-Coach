from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, Ticket, TicketStatus, Conversation, AuditLog
from schemas.schemas import AnalyticsSummary, AuditLogOut
from auth.dependencies import require_roles

router = APIRouter(tags=["analytics"])


@router.get("/analytics", response_model=AnalyticsSummary)
def analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "admin")),
):
    total_tickets = db.query(func.count(Ticket.id)).scalar() or 0
    pending = db.query(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.pending).scalar() or 0
    resolved = db.query(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.resolved).scalar() or 0
    escalated = db.query(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.escalated).scalar() or 0
    closed = db.query(func.count(Ticket.id)).filter(Ticket.status == TicketStatus.closed).scalar() or 0

    total_conversations = db.query(func.count(Conversation.id)).scalar() or 0
    
    avg_confidence = 0.0
    escalation_rate = 0.0
    sentiment_counts = {}
    
    if total_conversations > 0:
        avg_confidence = db.query(func.avg(Conversation.confidence_score)).scalar() or 0.0
        escalated_convos = db.query(func.count(Conversation.id)).filter(Conversation.escalation_recommended == True).scalar() or 0
        escalation_rate = escalated_convos / total_conversations
        
        sentiment_group = db.query(Conversation.sentiment, func.count(Conversation.id)).group_by(Conversation.sentiment).all()
        sentiment_counts = { (s.value if s else "unknown"): count for s, count in sentiment_group }

    return AnalyticsSummary(
        total_tickets=total_tickets,
        pending_tickets=pending,
        resolved_tickets=resolved,
        escalated_tickets=escalated,
        closed_tickets=closed,
        total_conversations=total_conversations,
        avg_confidence_score=round(float(avg_confidence), 3),
        escalation_rate=round(float(escalation_rate), 3),
        sentiment_breakdown=sentiment_counts,
    )


@router.get("/audit-logs", response_model=list[AuditLogOut])
def audit_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).all()
