import re

from agents.base import BaseAgent

_CATEGORY_RULES = {
    "billing": [r"\bbill(ing)?\b", r"\bcharge[ds]?\b", r"\binvoice\b", r"\brefund\b", r"\bpayment\b", r"\bsubscription\b"],
    "technical": [r"\berror\b", r"\bbug\b", r"\bcrash(ed|ing)?\b", r"\bnot working\b", r"\bissue\b", r"\bapi\b", r"\blogin\b"],
    "account": [r"\baccount\b", r"\bpassword\b", r"\busername\b", r"\bprofile\b", r"\baccess\b", r"\blocked out\b"],
    "shipping": [r"\bship(ping|ment)?\b", r"\bdelivery\b", r"\btracking\b", r"\border\b", r"\bpackage\b"],
    "legal_compliance": [r"\blegal\b", r"\bgdpr\b", r"\bprivacy\b", r"\bterms of service\b", r"\bcompliance\b"],
}

_FOLLOW_UP_BANK = {
    "billing": ["Would you like a copy of the invoice emailed to you?", "Should I check for any pending refunds on this account?"],
    "technical": ["Can you tell me what device or browser you're using?", "Does this happen every time, or only sometimes?"],
    "account": ["Would you like help resetting your password now?", "Can you confirm the email on the account for verification?"],
    "shipping": ["Do you have the order number handy?", "Would you like me to check the current tracking status?"],
    "legal_compliance": ["Would you like this routed to our compliance team directly?"],
    "general": ["Is there anything else about this I can clarify?"],
}


class ClassificationAgent(BaseAgent):
    """
    Auto Ticket Classification + Auto Priority Detection + Follow-up Suggestions.
    Rule-based for speed/determinism/cost; swap for an LLM or fine-tuned
    classifier for finer-grained categories in production.
    """
    name = "classification_agent"

    def run(self, question: str, sentiment: str, escalation_recommended: bool) -> dict:
        lowered = question.lower()
        category = "general"
        for cat, patterns in _CATEGORY_RULES.items():
            if any(re.search(p, lowered) for p in patterns):
                category = cat
                break

        # Priority: escalation always wins, then sentiment severity.
        if escalation_recommended:
            priority = "urgent"
        elif sentiment in ("angry",):
            priority = "high"
        elif sentiment in ("urgent", "negative"):
            priority = "normal" if sentiment == "negative" else "high"
        else:
            priority = "normal" if sentiment == "neutral" else "low"

        follow_ups = _FOLLOW_UP_BANK.get(category, _FOLLOW_UP_BANK["general"])

        return {"category": category, "priority": priority, "follow_up_suggestions": follow_ups}
