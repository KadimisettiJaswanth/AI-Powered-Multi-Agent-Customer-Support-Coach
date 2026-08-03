import re
from agents.base import BaseAgent

_ESCALATION_RULES = {
    "legal_threat": ([r"\blawsuit\b", r"\blawyer\b", r"\battorney\b", r"\bsue\b", r"\blegal action\b", r"\bdispute\b"], 90.0),
    "fraud_security": ([r"\bfraud\b", r"\bscam\b", r"\bunauthorized charge\b", r"\bstolen\b", r"\bhack(ed)?\b", r"\bbreach\b"], 85.0),
    "severe_outage": ([r"\boutage\b", r"\bdown\b", r"\bdata loss\b", r"\bcritical bug\b", r"\b504 gateway\b"], 75.0),
    "financial_dispute": ([r"\brefund\b", r"\bchargeback\b", r"\bmoney back\b", r"\bcharged twice\b"], 70.0),
}


class EscalationAgent(BaseAgent):
    """
    Agent 5: Escalation Risk Monitor Agent.
    Continuously scores escalation likelihood (0-100), gives reasoning,
    and recommends resolution strategies. Triggers high-risk alert when score >= 70.
    """
    name = "escalation_agent"

    def run(self, question: str, sentiment: str | None = None, frustration_level: float = 0.0) -> dict:
        lowered = question.lower()
        score = 10.0
        reasons = []
        interventions = []

        for category, (patterns, base_weight) in _ESCALATION_RULES.items():
            if any(re.search(p, lowered) for p in patterns):
                score = max(score, base_weight)
                reasons.append(category.replace("_", " ").title())

        # Sentiment & Frustration multiplier
        if sentiment == "angry":
            score += 20.0
            reasons.append("Angry Customer Sentiment")
        elif sentiment == "urgent":
            score += 10.0
            reasons.append("Urgent Request")

        if frustration_level > 70:
            score += 15.0

        score = min(round(score, 1), 100.0)
        is_high_risk = score >= 70.0
        should_escalate = is_high_risk

        if "Legal Threat" in reasons or "Fraud Security" in reasons:
            recommended_resolution = "Immediately express empathy, verify account ownership securely, and offer Tier-2 / Specialist escalation if not resolved."
        elif "Financial Dispute" in reasons:
            recommended_resolution = "Verify payment transaction ID, acknowledge the inconvenience, and outline exact refund processing steps (3-5 days)."
        elif "Severe Outage" in reasons:
            recommended_resolution = "Provide status page link, suggest temporary workaround endpoint, and offer direct status updates."
        elif is_high_risk:
            recommended_resolution = "De-escalate with warm empathetic language, offer a credit or supervisor callback."
        else:
            recommended_resolution = "Standard support resolution guided by RAG knowledge base articles."

        reason_str = ", ".join(reasons) if reasons else "Low risk routine interaction"

        return {
            "escalation_score": score,
            "is_high_risk": is_high_risk,
            "escalation_recommended": should_escalate,
            "escalation_reason": reason_str,
            "recommended_resolution": recommended_resolution,
        }
