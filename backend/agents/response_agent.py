from agents.base import BaseAgent
from llm.provider import get_llm_provider

SYSTEM_PROMPT = """You are a professional customer support AI assistant.
Answer only using the provided company documents context below.
Do not guess. Do not invent information that is not present in the context.
Be polite, clear, and professional.
If this is a multi-turn conversation, stay consistent with what was already said earlier in the thread.
If the answer is not available in the context, reply exactly:
"I don't know based on available company documents."
"""


def build_user_prompt(
    question: str,
    context_text: str,
    has_context: bool,
    tone_hint: str = "professional",
    conversation_history: list[dict] | None = None,
) -> str:
    """Shared prompt construction used by both the synchronous ResponseAgent
    and the streaming chat endpoint, so memory + grounding logic lives in one place."""
    history_block = ""
    if conversation_history:
        turns = []
        for turn in conversation_history[-5:]:  # last 5 turns is plenty of context, keeps prompts small
            cust = turn.get("customer_message") or turn.get("question", "")
            ag = turn.get("agent_message") or turn.get("response", "")
            turns.append(f"Customer: {cust}\nAgent: {ag}")

        history_block = "Prior turns in this conversation (most recent last):\n" + "\n\n".join(turns) + "\n\n"

    if not has_context:
        return (
            f"{history_block}"
            f"Customer Question: {question}\n\n"
            f"Relevant Context: NO_CONTEXT_FOUND\n\n"
            f"Instructions: No relevant company documents were found. "
            f"You must reply exactly: \"I don't know based on available company documents.\""
        )

    return (
        f"{history_block}"
        f"Customer Question: {question}\n\n"
        f"Relevant Context:\n{context_text}\n\n"
        f"Instructions: Generate a professional customer support response using ONLY "
        f"the context above. Preferred tone: {tone_hint}. "
        f"Never hallucinate or add information not present in the context."
    )


class ResponseAgent(BaseAgent):
    """
    Agent 3: Response Generation Agent.
    Generates a professional response USING ONLY the retrieved context
    (plus recent conversation turns for continuity). Never called without
    retrieval having run first (enforced by orchestrator).
    """
    name = "response_agent"

    def run(
        self,
        question: str,
        context_text: str,
        has_context: bool,
        tone_hint: str = "professional",
        conversation_history: list[dict] | None = None,
    ) -> dict:
        user_prompt = build_user_prompt(question, context_text, has_context, tone_hint, conversation_history)
        llm = get_llm_provider()
        response_text = llm.generate(SYSTEM_PROMPT, user_prompt)

        # Simple confidence heuristic: grounded in context length/overlap.
        # (Swap for a calibrated classifier or LLM self-critique in production.)
        confidence = 0.9 if has_context else 0.2

        return {"response_text": response_text.strip(), "confidence_score": confidence}
