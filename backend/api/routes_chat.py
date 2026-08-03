import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database.db import get_db, SessionLocal
from database.models import User, Customer, Conversation
from schemas.schemas import ChatRequest, ChatResponse, SourceChunk
from auth.dependencies import get_current_user, get_current_user_from_token_param
from agents.orchestrator import get_orchestrator
from agents.response_agent import build_user_prompt, SYSTEM_PROMPT
from llm.provider import get_llm_provider
from utils.rate_limit import rate_limit

router = APIRouter(tags=["chat"])


def _get_thread_history(db: Session, thread_id: str, exclude_id: Optional[str] = None) -> list[dict]:
    """Conversation memory: pull prior turns in this thread, oldest first."""
    if not thread_id:
        return []
    query = db.query(Conversation).filter(Conversation.thread_id == thread_id)
    if exclude_id:
        query = query.filter(Conversation.id != exclude_id)
    rows = query.order_by(Conversation.created_at.asc()).all()
    return [
        {"question": c.question, "response": c.final_response or c.ai_suggested_response or ""}
        for c in rows
    ]


def _resolve_customer(db: Session, customer_id: Optional[str], customer_name: Optional[str]) -> Optional[Customer]:
    if customer_id:
        return db.query(Customer).filter(Customer.id == customer_id).first()
    if customer_name:
        customer = Customer(name=customer_name)
        db.add(customer)
        db.flush()
        return customer
    return None


def _sources_from_hits(hits: list[dict]) -> list[SourceChunk]:
    return [
        SourceChunk(
            document_name=h["metadata"].get("document_name", "unknown"),
            chunk_id=h["metadata"].get("chunk_id", ""),
            text_snippet=h["text"][:200],
            score=h["score"],
        )
        for h in hits
    ]


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(rate_limit("chat", max_requests=30, window_seconds=60))],
)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    thread_id = payload.thread_id or str(uuid.uuid4())
    history = _get_thread_history(db, thread_id)

    orchestrator = get_orchestrator()
    result = orchestrator.handle_question(payload.question, conversation_history=history)

    customer = _resolve_customer(db, payload.customer_id, payload.customer_name)
    sources = _sources_from_hits(result["retrieval"]["hits"])

    conversation = Conversation(
        thread_id=thread_id,
        customer_id=customer.id if customer else None,
        agent_id=current_user.id,
        question=payload.question,
        ai_suggested_response=result["response"]["response_text"],
        retrieved_context=result["retrieval"]["context_text"][:8000],
        source_documents=json.dumps([s.model_dump() for s in sources]),
        sentiment=result["sentiment"]["sentiment"],
        escalation_recommended=result["escalation"]["escalation_recommended"],
        escalation_reason=result["escalation"]["escalation_reason"],
        policy_flagged=result["policy"]["policy_flagged"],
        policy_notes=result["policy"]["policy_notes"],
        confidence_score=result["response"]["confidence_score"],
        summary=result["summary"]["summary"],
        auto_category=result["classification"]["category"],
        auto_priority=result["classification"]["priority"],
        language=result["language"]["language_code"],
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return ChatResponse(
        conversation_id=conversation.id,
        thread_id=thread_id,
        ai_response=result["response"]["response_text"],
        confidence_score=result["response"]["confidence_score"],
        sources=sources,
        sentiment=result["sentiment"]["sentiment"],
        escalation_recommended=result["escalation"]["escalation_recommended"],
        escalation_reason=result["escalation"]["escalation_reason"],
        policy_flagged=result["policy"]["policy_flagged"],
        policy_notes=result["policy"]["policy_notes"],
        summary=result["summary"]["summary"],
        suggested_tone=result["sentiment"]["suggested_tone"],
        category=result["classification"]["category"],
        priority=result["classification"]["priority"],
        follow_up_suggestions=result["classification"]["follow_up_suggestions"],
        language_code=result["language"]["language_code"],
        language_name=result["language"]["language_name"],
    )


@router.get("/chat/stream", dependencies=[Depends(rate_limit("chat_stream", max_requests=30, window_seconds=60))])
def chat_stream(
    question: str,
    token: str,
    thread_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    customer_name: Optional[str] = None,
):
    """
    Server-Sent Events streaming version of /chat.
    A GET (not POST) + query-string token because native EventSource can't
    send Authorization headers or a JSON body -- the frontend passes the JWT
    as a query param instead. Only ever use over HTTPS in production.

    Event sequence:
      event: token   (repeated) -- one response chunk at a time
      event: done    (once)     -- full metadata: sources, confidence, sentiment, etc.
      event: error   (on failure)
    """
    db = SessionLocal()
    try:
        current_user = get_current_user_from_token_param(token, db)
    except Exception:
        db.close()
        def _unauth():
            yield f"event: error\ndata: {json.dumps({'detail': 'Invalid or expired token'})}\n\n"
        return StreamingResponse(_unauth(), media_type="text/event-stream")

    def event_generator():
        try:
            resolved_thread_id = thread_id or str(uuid.uuid4())
            history = _get_thread_history(db, resolved_thread_id)

            orchestrator = get_orchestrator()
            prepared = orchestrator.prepare(question, conversation_history=history)
            prepared["_question"] = question

            user_prompt = build_user_prompt(
                question=question,
                context_text=prepared["retrieval"]["context_text"],
                has_context=prepared["retrieval"]["has_context"],
                tone_hint=prepared["sentiment"]["suggested_tone"],
                conversation_history=history,
            )

            llm = get_llm_provider()
            full_text = ""
            for chunk in llm.generate_stream(SYSTEM_PROMPT, user_prompt):
                full_text += chunk
                yield f"event: token\ndata: {json.dumps({'text': chunk})}\n\n"

            confidence = 0.9 if prepared["retrieval"]["has_context"] else 0.2
            result = orchestrator.finalize(prepared, full_text.strip(), confidence)

            customer = _resolve_customer(db, customer_id, customer_name)
            sources = _sources_from_hits(result["retrieval"]["hits"])

            conversation = Conversation(
                thread_id=resolved_thread_id,
                customer_id=customer.id if customer else None,
                agent_id=current_user.id,
                question=question,
                ai_suggested_response=result["response"]["response_text"],
                retrieved_context=result["retrieval"]["context_text"][:8000],
                source_documents=json.dumps([s.model_dump() for s in sources]),
                sentiment=result["sentiment"]["sentiment"],
                escalation_recommended=result["escalation"]["escalation_recommended"],
                escalation_reason=result["escalation"]["escalation_reason"],
                policy_flagged=result["policy"]["policy_flagged"],
                policy_notes=result["policy"]["policy_notes"],
                confidence_score=result["response"]["confidence_score"],
                summary=result["summary"]["summary"],
                auto_category=result["classification"]["category"],
                auto_priority=result["classification"]["priority"],
                language=result["language"]["language_code"],
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

            done_payload = {
                "conversation_id": conversation.id,
                "thread_id": resolved_thread_id,
                "confidence_score": result["response"]["confidence_score"],
                "sources": [s.model_dump() for s in sources],
                "sentiment": result["sentiment"]["sentiment"],
                "escalation_recommended": result["escalation"]["escalation_recommended"],
                "escalation_reason": result["escalation"]["escalation_reason"],
                "policy_flagged": result["policy"]["policy_flagged"],
                "policy_notes": result["policy"]["policy_notes"],
                "summary": result["summary"]["summary"],
                "suggested_tone": result["sentiment"]["suggested_tone"],
                "category": result["classification"]["category"],
                "priority": result["classification"]["priority"],
                "follow_up_suggestions": result["classification"]["follow_up_suggestions"],
                "language_code": result["language"]["language_code"],
                "language_name": result["language"]["language_name"],
            }
            yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"
        except Exception as exc:  # noqa: BLE001
            yield f"event: error\ndata: {json.dumps({'detail': str(exc)})}\n\n"
        finally:
            db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/history")
def history(
    customer_id: Optional[str] = Query(None),
    thread_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None, description="search text within questions"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Conversation)
    if customer_id:
        query = query.filter(Conversation.customer_id == customer_id)
    if thread_id:
        query = query.filter(Conversation.thread_id == thread_id)
    if q:
        query = query.filter(Conversation.question.ilike(f"%{q}%"))
    order = Conversation.created_at.asc() if thread_id else Conversation.created_at.desc()
    rows = query.order_by(order).limit(limit).all()
    return [
        {
            "id": c.id,
            "thread_id": c.thread_id,
            "question": c.question,
            "ai_suggested_response": c.ai_suggested_response,
            "final_response": c.final_response,
            "sentiment": c.sentiment,
            "escalation_recommended": c.escalation_recommended,
            "confidence_score": c.confidence_score,
            "summary": c.summary,
            "auto_category": c.auto_category,
            "auto_priority": c.auto_priority,
            "language": c.language,
            "created_at": c.created_at,
        }
        for c in rows
    ]


@router.get("/history/export")
def export_history(
    customer_id: Optional[str] = Query(None),
    thread_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    limit: int = Query(1000, le=5000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Chat History Export. Streams a CSV of matching conversations -- same
    filters as /history (customer, thread, text search).
    """
    import csv
    import io

    query = db.query(Conversation)
    if customer_id:
        query = query.filter(Conversation.customer_id == customer_id)
    if thread_id:
        query = query.filter(Conversation.thread_id == thread_id)
    if q:
        query = query.filter(Conversation.question.ilike(f"%{q}%"))
    rows = query.order_by(Conversation.created_at.desc()).limit(limit).all()

    def generate():
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            "id", "thread_id", "created_at", "question", "ai_suggested_response",
            "final_response", "sentiment", "escalation_recommended", "escalation_reason",
            "confidence_score", "category", "priority", "language", "summary",
        ])
        yield buffer.getvalue()
        buffer.seek(0); buffer.truncate(0)

        for c in rows:
            writer.writerow([
                c.id, c.thread_id, c.created_at.isoformat(), c.question,
                c.ai_suggested_response, c.final_response, c.sentiment,
                c.escalation_recommended, c.escalation_reason, c.confidence_score,
                c.auto_category, c.auto_priority, c.language, c.summary,
            ])
            yield buffer.getvalue()
            buffer.seek(0); buffer.truncate(0)

    filename = f"conversation-history-{thread_id or 'all'}.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
