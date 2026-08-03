import re
from agents.base import BaseAgent

_NEGATIVE_WORDS = {"bad", "broken", "terrible", "worst", "hate", "disappointed", "unacceptable", "wrong", "issue", "problem", "charged", "fail", "slow"}
_ANGRY_WORDS = {"furious", "angry", "outrageous", "scam", "ridiculous", "unbelievable", "disgusted", "dispute", "sue", "legal", "lawyer", "twice", "fraud"}
_URGENT_WORDS = {"urgent", "asap", "immediately", "now", "emergency", "right away", "down", "outage"}
_POSITIVE_WORDS = {"thanks", "thank you", "great", "awesome", "love", "happy", "appreciate", "excellent", "resolved", "helped"}


class SentimentAgent(BaseAgent):
    """
    Agent 2: Intent & Sentiment Analysis Agent.
    Identifies customer intent, emotional state, frustration level (0-100),
    satisfaction trend, and suggested tone.
    """
    name = "sentiment_agent"

    def run(self, text: str, prior_frustration: float = None) -> dict:
        lowered = text.lower()
        tokens = set(re.findall(r"[a-z']+", lowered))
        exclaim_count = text.count("!")
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)

        # Detect Intent
        intent = "General Inquiry"
        if any(w in lowered for w in ["refund", "charged", "billing", "invoice", "payment", "money"]):
            intent = "Billing & Refund"
        elif any(w in lowered for w in ["down", "error", "bug", "timeout", "api", "broken", "504"]):
            intent = "Technical Support"
        elif any(w in lowered for w in ["cancel", "downgrade", "close account", "stop subscription"]):
            intent = "Cancellation Request"
        elif any(w in lowered for w in ["hack", "leaked", "russia", "unauthorized", "login", "password"]):
            intent = "Security Alert"

        # Calculate Frustration Level (0 to 100)
        frustration_level = 10.0
        if tokens & _ANGRY_WORDS or caps_ratio > 0.3 or exclaim_count >= 2:
            frustration_level = 85.0 + min(exclaim_count * 5, 15)
            sentiment = "angry"
            tone = "de-escalating, highly empathetic, acknowledge frustration, offer immediate solution"
        elif tokens & _URGENT_WORDS:
            frustration_level = 65.0
            sentiment = "urgent"
            tone = "action-oriented, clear, immediate step-by-step resolution"
        elif tokens & _NEGATIVE_WORDS:
            frustration_level = 45.0
            sentiment = "negative"
            tone = "empathetic, supportive, reassuring"
        elif tokens & _POSITIVE_WORDS:
            frustration_level = 5.0
            sentiment = "positive"
            tone = "warm, appreciative, professional"
        else:
            frustration_level = 20.0
            sentiment = "neutral"
            tone = "professional, helpful, concise"

        # Satisfaction trend compared to prior turn
        satisfaction_trend = "stable"
        if prior_frustration is not None:
            if frustration_level < prior_frustration - 15:
                satisfaction_trend = "improving"
            elif frustration_level > prior_frustration + 15:
                satisfaction_trend = "worsening"

        return {
            "intent": intent,
            "sentiment": sentiment,
            "frustration_level": min(round(frustration_level, 1), 100.0),
            "satisfaction_trend": satisfaction_trend,
            "suggested_tone": tone,
        }
