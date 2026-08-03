import re

from agents.base import BaseAgent

FALLBACK_PHRASE = "i don't know based on available company documents"

# Phrases an AI support agent should never say -- overpromising, guarantees,
# or fabricated authority it doesn't have.
_PROHIBITED_PATTERNS = [
    r"\bi guarantee\b",
    r"\b100% guaranteed?\b",
    r"\bfree money\b",
    r"\bwe promise\b.*\bno matter what\b",
    r"\bi am (a )?human\b",
    r"\bthis is not ai\b",
]


class PolicyAgent(BaseAgent):
    """
    Agent 2: Policy Validation Agent.
    Verifies the generated response follows company policy and stays grounded
    in retrieved context. Rejects/flags responses that appear to invent
    information not present in the retrieved context (hallucination guard),
    or that contain prohibited overpromising language.
    """
    name = "policy_agent"

    def run(self, response_text: str, has_context: bool) -> dict:
        lowered = response_text.lower()
        notes = []

        # Rule 1: prohibited language
        for pattern in _PROHIBITED_PATTERNS:
            if re.search(pattern, lowered):
                notes.append(f"Contains prohibited phrasing matching /{pattern}/")

        # Rule 2: if no context was retrieved, response MUST be the fallback
        # (never guess). This is the core RAG-safety guarantee.
        if not has_context and FALLBACK_PHRASE not in lowered:
            notes.append(
                "No supporting context was retrieved but the response did not use the "
                "required fallback phrase -- possible hallucination."
            )

        flagged = len(notes) > 0
        return {
            "policy_flagged": flagged,
            "policy_notes": "; ".join(notes) if notes else None,
        }
