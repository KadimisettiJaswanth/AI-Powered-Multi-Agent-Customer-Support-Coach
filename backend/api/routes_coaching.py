"""
API Routes for Real-Time AI Coaching Console, Customer Simulation, and Session Reporting.
"""
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user

from database.db import get_db
from database.models import User, CoachingSession, SessionTurn
from database.scenarios import SCENARIOS, get_scenario_by_id
from agents.orchestrator import get_orchestrator

router = APIRouter(prefix="/api/coaching", tags=["coaching"])


class CreateSessionRequest(BaseModel):
    mode: str  # simulator | manual | replay
    scenario_id: str | None = None
    custom_title: str | None = None
    custom_product_context: str | None = None
    custom_customer_persona: str | None = None


class TurnAnalyzeRequest(BaseModel):
    session_id: str
    customer_message: str
    agent_message: str | None = None


class SimulateTurnRequest(BaseModel):
    session_id: str
    agent_message: str | None = None



@router.get("/scenarios")
def list_scenarios():
    return {"scenarios": SCENARIOS}


@router.post("/sessions")
def create_coaching_session(
    req: CreateSessionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    title = req.custom_title or "Custom Session"
    product_context = req.custom_product_context or "General Customer Support"
    customer_persona = req.custom_customer_persona or "Customer seeking assistance"
    initial_msg = None
    replay_transcript = None

    if req.scenario_id:
        sc = get_scenario_by_id(req.scenario_id)
        if sc:
            title = sc["title"]
            product_context = sc["product_context"]
            customer_persona = sc["customer_persona"]
            initial_msg = sc.get("initial_message")
            replay_transcript = sc.get("replay_transcript")

    session_obj = CoachingSession(
        user_id=user.id,
        mode=req.mode,
        scenario_id=req.scenario_id,
        scenario_title=title,
        product_context=product_context,
        customer_persona=customer_persona,
        status="active"
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)

    # If simulator mode and scenario has initial message, automatically run turn 1 analysis
    first_turn_data = None
    if req.mode in ("simulator", "replay") and initial_msg:
        orchestrator = get_orchestrator()
        analysis = orchestrator.analyze_turn(customer_message=initial_msg)

        turn = SessionTurn(
            session_id=session_obj.id,
            turn_index=1,
            customer_message=initial_msg,
            intent=analysis["sentiment"]["intent"],
            sentiment=analysis["sentiment"]["sentiment"],
            frustration_level=analysis["sentiment"]["frustration_level"],
            satisfaction_trend=analysis["sentiment"]["satisfaction_trend"],
            escalation_score=analysis["escalation"]["escalation_score"],
            is_high_risk=analysis["escalation"]["is_high_risk"],
            escalation_reason=analysis["escalation"]["escalation_reason"],
            escalation_recommendation=analysis["escalation"]["recommended_resolution"],
            suggested_response=analysis["response"]["response_text"],
            tone_clarity_score=analysis["coaching"]["tone_clarity_score"],
            coaching_tips=json.dumps(analysis["coaching"]["coaching_tips"]),
            retrieved_knowledge=json.dumps(analysis["retrieval"].get("hits", []))
        )
        db.add(turn)
        db.commit()
        db.refresh(turn)
        first_turn_data = {
            "id": turn.id,
            "turn_index": 1,
            "customer_message": turn.customer_message,
            "intent": turn.intent,
            "sentiment": turn.sentiment,
            "frustration_level": turn.frustration_level,
            "escalation_score": turn.escalation_score,
            "is_high_risk": turn.is_high_risk,
            "escalation_reason": turn.escalation_reason,
            "escalation_recommendation": turn.escalation_recommendation,
            "suggested_response": turn.suggested_response,
            "tone_clarity_score": turn.tone_clarity_score,
            "coaching_tips": analysis["coaching"]["coaching_tips"],
            "retrieved_knowledge": analysis["retrieval"].get("hits", [])
        }

    return {
        "id": session_obj.id,
        "session_id": session_obj.id,
        "mode": session_obj.mode,

        "scenario_title": session_obj.scenario_title,
        "product_context": session_obj.product_context,
        "customer_persona": session_obj.customer_persona,
        "first_turn": first_turn_data
    }


@router.get("/sessions")
def list_coaching_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    sessions = db.query(CoachingSession).filter(CoachingSession.user_id == user.id).order_by(CoachingSession.created_at.desc()).all()
    
    session_ids = [s.id for s in sessions]
    turn_counts = {}
    if session_ids:
        from sqlalchemy import func
        counts = db.query(SessionTurn.session_id, func.count(SessionTurn.id)).filter(
            SessionTurn.session_id.in_(session_ids)
        ).group_by(SessionTurn.session_id).all()
        turn_counts = {sess_id: count for sess_id, count in counts}
        
    res = []
    for s in sessions:
        res.append({
            "id": s.id,
            "mode": s.mode,
            "scenario_title": s.scenario_title,
            "status": s.status,
            "resolution_score": s.resolution_score,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "turn_count": turn_counts.get(s.id, 0)
        })
    return {"sessions": res}


@router.delete("/sessions/{session_id}")
def delete_coaching_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session_obj = db.query(CoachingSession).filter(CoachingSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session_obj)
    db.commit()
    return {"status": "deleted", "id": session_id}


@router.get("/sessions/{session_id}")
def get_session_details(


    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session_obj = db.query(CoachingSession).filter(CoachingSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    turns = db.query(SessionTurn).filter(SessionTurn.session_id == session_id).order_by(SessionTurn.turn_index.asc()).all()
    formatted_turns = []
    for t in turns:
        formatted_turns.append({
            "id": t.id,
            "turn_index": t.turn_index,
            "customer_message": t.customer_message,
            "agent_message": t.agent_message,
            "intent": t.intent,
            "sentiment": t.sentiment,
            "frustration_level": t.frustration_level,
            "satisfaction_trend": t.satisfaction_trend,
            "escalation_score": t.escalation_score,
            "is_high_risk": t.is_high_risk,
            "escalation_reason": t.escalation_reason,
            "escalation_recommendation": t.escalation_recommendation,
            "suggested_response": t.suggested_response,
            "tone_clarity_score": t.tone_clarity_score,
            "coaching_tips": json.loads(t.coaching_tips) if t.coaching_tips else [],
            "retrieved_knowledge": json.loads(t.retrieved_knowledge) if t.retrieved_knowledge else []
        })

    return {
        "id": session_obj.id,
        "mode": session_obj.mode,
        "scenario_id": session_obj.scenario_id,
        "scenario_title": session_obj.scenario_title,
        "product_context": session_obj.product_context,
        "customer_persona": session_obj.customer_persona,
        "status": session_obj.status,
        "resolution_score": session_obj.resolution_score,
        "summary_report": json.loads(session_obj.summary_report) if session_obj.summary_report else None,
        "turns": formatted_turns
    }


@router.post("/simulate-turn")
def simulate_customer_turn(
    req: SimulateTurnRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session_obj = db.query(CoachingSession).filter(CoachingSession.id == req.session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    existing_turns = db.query(SessionTurn).filter(SessionTurn.session_id == req.session_id).order_by(SessionTurn.turn_index.asc()).all()
    if existing_turns and req.agent_message:
        existing_turns[-1].agent_message = req.agent_message
        db.commit()

    history = [{"customer_message": t.customer_message, "agent_message": t.agent_message} for t in existing_turns]


    customer_text = ""
    # In replay mode, check if replay transcript exists
    if session_obj.mode == "replay" and session_obj.scenario_id:
        sc = get_scenario_by_id(session_obj.scenario_id)
        if sc and sc.get("replay_transcript"):
            next_idx = len(existing_turns)
            if next_idx < len(sc["replay_transcript"]):
                customer_text = sc["replay_transcript"][next_idx]["customer"]

    if not customer_text:
        orchestrator = get_orchestrator()
        customer_text = orchestrator.simulate_customer_message(
            scenario_title=session_obj.scenario_title,
            product_context=session_obj.product_context,
            customer_persona=session_obj.customer_persona,
            conversation_history=history
        )

    # Run analysis pipeline on simulated customer turn
    orchestrator = get_orchestrator()
    prior_frustration = existing_turns[-1].frustration_level if existing_turns else None
    analysis = orchestrator.analyze_turn(
        customer_message=customer_text,
        prior_frustration=prior_frustration,
        conversation_history=history
    )

    next_turn_idx = len(existing_turns) + 1
    turn = SessionTurn(
        session_id=session_obj.id,
        turn_index=next_turn_idx,
        customer_message=customer_text,
        intent=analysis["sentiment"]["intent"],
        sentiment=analysis["sentiment"]["sentiment"],
        frustration_level=analysis["sentiment"]["frustration_level"],
        satisfaction_trend=analysis["sentiment"]["satisfaction_trend"],
        escalation_score=analysis["escalation"]["escalation_score"],
        is_high_risk=analysis["escalation"]["is_high_risk"],
        escalation_reason=analysis["escalation"]["escalation_reason"],
        escalation_recommendation=analysis["escalation"]["recommended_resolution"],
        suggested_response=analysis["response"]["response_text"],
        tone_clarity_score=analysis["coaching"]["tone_clarity_score"],
        coaching_tips=json.dumps(analysis["coaching"]["coaching_tips"]),
        retrieved_knowledge=json.dumps(analysis["retrieval"].get("hits", []))
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)

    return {
        "turn": {
            "id": turn.id,
            "turn_index": next_turn_idx,
            "customer_message": turn.customer_message,
            "intent": turn.intent,
            "sentiment": turn.sentiment,
            "frustration_level": turn.frustration_level,
            "satisfaction_trend": turn.satisfaction_trend,
            "escalation_score": turn.escalation_score,
            "is_high_risk": turn.is_high_risk,
            "escalation_reason": turn.escalation_reason,
            "escalation_recommendation": turn.escalation_recommendation,
            "suggested_response": turn.suggested_response,
            "tone_clarity_score": turn.tone_clarity_score,
            "coaching_tips": analysis["coaching"]["coaching_tips"],
            "retrieved_knowledge": analysis["retrieval"].get("hits", [])
        }
    }


@router.post("/analyze-turn")
def analyze_customer_turn(
    req: TurnAnalyzeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session_obj = db.query(CoachingSession).filter(CoachingSession.id == req.session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    existing_turns = db.query(SessionTurn).filter(SessionTurn.session_id == req.session_id).order_by(SessionTurn.turn_index.asc()).all()

    # If the last turn has customer_message but no agent_message, update agent_message on that turn
    if existing_turns and existing_turns[-1].agent_message is None and req.agent_message:
        existing_turns[-1].agent_message = req.agent_message
        db.commit()

    history = [{"customer_message": t.customer_message, "agent_message": t.agent_message} for t in existing_turns]

    orchestrator = get_orchestrator()
    prior_frustration = existing_turns[-1].frustration_level if existing_turns else None
    analysis = orchestrator.analyze_turn(
        customer_message=req.customer_message,
        prior_frustration=prior_frustration,
        conversation_history=history
    )

    next_turn_idx = len(existing_turns) + 1
    turn = SessionTurn(
        session_id=session_obj.id,
        turn_index=next_turn_idx,
        customer_message=req.customer_message,
        agent_message=req.agent_message,
        intent=analysis["sentiment"]["intent"],
        sentiment=analysis["sentiment"]["sentiment"],
        frustration_level=analysis["sentiment"]["frustration_level"],
        satisfaction_trend=analysis["sentiment"]["satisfaction_trend"],
        escalation_score=analysis["escalation"]["escalation_score"],
        is_high_risk=analysis["escalation"]["is_high_risk"],
        escalation_reason=analysis["escalation"]["escalation_reason"],
        escalation_recommendation=analysis["escalation"]["recommended_resolution"],
        suggested_response=analysis["response"]["response_text"],
        tone_clarity_score=analysis["coaching"]["tone_clarity_score"],
        coaching_tips=json.dumps(analysis["coaching"]["coaching_tips"]),
        retrieved_knowledge=json.dumps(analysis["retrieval"].get("hits", []))
    )
    db.add(turn)
    db.commit()
    db.refresh(turn)

    return {
        "turn": {
            "id": turn.id,
            "turn_index": next_turn_idx,
            "customer_message": turn.customer_message,
            "agent_message": turn.agent_message,
            "intent": turn.intent,
            "sentiment": turn.sentiment,
            "frustration_level": turn.frustration_level,
            "satisfaction_trend": turn.satisfaction_trend,
            "escalation_score": turn.escalation_score,
            "is_high_risk": turn.is_high_risk,
            "escalation_reason": turn.escalation_reason,
            "escalation_recommendation": turn.escalation_recommendation,
            "suggested_response": turn.suggested_response,
            "tone_clarity_score": turn.tone_clarity_score,
            "coaching_tips": analysis["coaching"]["coaching_tips"],
            "retrieved_knowledge": analysis["retrieval"].get("hits", [])
        }
    }


@router.post("/finish-session/{session_id}")
def finish_coaching_session(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session_obj = db.query(CoachingSession).filter(CoachingSession.id == session_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")

    turns = db.query(SessionTurn).filter(SessionTurn.session_id == session_id).order_by(SessionTurn.turn_index.asc()).all()
    formatted_turns = [
        {
            "turn_index": t.turn_index,
            "customer_message": t.customer_message,
            "agent_message": t.agent_message,
            "sentiment": t.sentiment,
            "frustration_level": t.frustration_level,
            "escalation_score": t.escalation_score,
            "tone_clarity_score": t.tone_clarity_score,
        }
        for t in turns
    ]

    orchestrator = get_orchestrator()
    report = orchestrator.summary_agent.generate_post_session_report(
        session_title=session_obj.scenario_title,
        turns=formatted_turns
    )

    session_obj.status = "completed"
    session_obj.resolution_score = report["resolution_quality_score"]
    session_obj.summary_report = json.dumps(report)
    db.commit()

    return {"status": "completed", "report": report}


@router.get("/report/{session_id}")
def get_session_report(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    session_obj = db.query(CoachingSession).filter(CoachingSession.id == session_id).first()
    if not session_obj or not session_obj.summary_report:
        raise HTTPException(status_code=404, detail="Report not generated yet for this session")

    return json.loads(session_obj.summary_report)
