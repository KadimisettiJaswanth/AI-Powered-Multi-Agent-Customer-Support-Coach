from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, Feedback, Conversation
from schemas.schemas import FeedbackCreate, FeedbackOut
from auth.dependencies import get_current_user

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=FeedbackOut)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    convo = db.query(Conversation).filter(Conversation.id == payload.conversation_id).first()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    feedback = Feedback(
        conversation_id=payload.conversation_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
