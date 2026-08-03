from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, Ticket, TicketStatus, Conversation
from schemas.schemas import TicketCreate, TicketUpdate, TicketOut
from auth.dependencies import get_current_user
from utils.audit import log_action

router = APIRouter(tags=["tickets"])


@router.post("/ticket", response_model=TicketOut)
def create_ticket(
    payload: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    priority = payload.priority
    category = payload.category

    # Auto Ticket Classification / Auto Priority Detection: if the ticket is
    # linked to a conversation and priority/category weren't given explicitly,
    # pull them from what the ClassificationAgent already determined.
    if payload.conversation_id and (priority is None or category is None):
        convo = db.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
        if convo:
            priority = priority or convo.auto_priority or "normal"
            category = category or convo.auto_category

    ticket = Ticket(
        subject=payload.subject,
        description=payload.description,
        customer_id=payload.customer_id,
        conversation_id=payload.conversation_id,
        priority=priority or "normal",
        category=category,
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/tickets", response_model=list[TicketOut])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Ticket)
    if status_filter:
        try:
            query = query.filter(Ticket.status == TicketStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
    return query.order_by(Ticket.created_at.desc()).all()


@router.put("/ticket/{ticket_id}", response_model=TicketOut)
def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    changes = []
    if payload.status is not None:
        try:
            ticket.status = TicketStatus(payload.status)
            changes.append(f"status->{payload.status}")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")
    if payload.priority is not None:
        ticket.priority = payload.priority
        changes.append(f"priority->{payload.priority}")
    if payload.description is not None:
        ticket.description = payload.description

    if changes:
        log_action(db, current_user.id, "ticket_updated", f"ticket_id={ticket.id}; {', '.join(changes)}")

    db.commit()
    db.refresh(ticket)
    return ticket
