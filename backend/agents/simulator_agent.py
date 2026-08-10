"""
Customer Simulator Agent.
Generates realistic, scenario-consistent customer messages turn by turn
with persona and emotional progression.
"""
from agents.base import BaseAgent
from llm.provider import get_llm_provider


class CustomerSimulatorAgent(BaseAgent):
    name = "customer_simulator"

    def run(self, scenario_title: str, product_context: str, customer_persona: str, conversation_history: list[dict] = None) -> str:
        llm = get_llm_provider()
        system_prompt = (
            "You are an AI acting as a human customer in a live customer support training simulation.\n"
            "Your objective is to generate highly realistic, natural, and conversational responses turn-by-turn.\n\n"
            "CRITICAL RULES:\n"
            "1. Stay strictly in character. Adopt the provided persona, emotional state, and scenario context flawlessly.\n"
            "2. Be concise and authentic. Real customers rarely write long essays; they write short, direct messages.\n"
            "3. React dynamically. If the support agent is helpful, your frustration should decrease. If they are unhelpful, escalate your emotion.\n"
            "4. NEVER break character and NEVER act as the support agent.\n"
            "5. OUTPUT ONLY the exact text of your next message. Do NOT prefix with 'Customer:' or wrap in quotes or markdown."
        )

        history_str = ""
        if conversation_history:
            history_str = "\n".join(
                [f"Customer: {h.get('customer_message', '')}\nAgent: {h.get('agent_message', '')}" for h in conversation_history if h.get('customer_message')]
            )

        user_prompt = (
            f"Scenario: {scenario_title}\n"
            f"Product Context: {product_context}\n"
            f"Persona & Goal: {customer_persona}\n\n"
            f"Conversation History So Far:\n{history_str or 'None (This is Turn 1)'}\n\n"
            f"Generate the next customer message now."
        )

        try:
            res = llm.generate(system_prompt, user_prompt)
            return res.strip()
        except Exception:
            if not conversation_history:
                return "Hi, I have an urgent issue regarding my account that I need resolved immediately."
            return "I am waiting for a clear answer on when this issue will be resolved."
