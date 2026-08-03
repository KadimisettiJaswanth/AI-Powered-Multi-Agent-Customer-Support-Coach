"""
Coaching & Response Suggestion Agent.
Evaluates agent tone, clarity, and communication quality, providing 2-3 actionable improvement tips.
"""
from agents.base import BaseAgent
from llm.provider import get_llm_provider


class CoachingAgent(BaseAgent):
    name = "coaching_agent"

    def run(self, customer_message: str, suggested_response: str, sentiment: str, frustration_level: float) -> dict:
        tips = []
        score = 85.0

        lowered_res = suggested_response.lower()

        # Check for empathy when frustration is high
        if frustration_level > 50:
            if not any(w in lowered_res for w in ["apologize", "sorry", "understand", "frustrat", "regret", "inconvenience"]):
                tips.append("💡 Add an explicit empathetic statement acknowledging the customer's frustration.")
                score -= 15.0
            else:
                tips.append("✅ Great empathy! You acknowledged their situation clearly.")

        # Check for actionable next steps
        if any(w in lowered_res for w in ["next step", "immediately", "will", "processed", "link", "number", "reference"]):
            tips.append("✅ Excellent clarity: Response includes clear actionable resolution steps.")
        else:
            tips.append("💡 Include concrete next steps or estimated timeline to reassure the customer.")
            score -= 10.0

        # Tone check
        if sentiment in ("angry", "urgent"):
            tips.append("🛡️ Maintain a calm, professional, and solution-focused tone; avoid defensive language.")

        return {
            "tone_clarity_score": max(min(round(score, 1), 100.0), 40.0),
            "coaching_tips": tips,
        }
