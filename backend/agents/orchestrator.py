"""
Multi-Agent Coaching Pipeline Orchestrator.

Orchestrates the Agents for every conversation exchange:
  1. CustomerSimulatorAgent  -> generates customer message turn (in Simulator mode)
  2. SentimentAgent          -> intent, sentiment, frustration meter, satisfaction trend
  3. LanguageAgent           -> detects language code & name
  4. RetrievalAgent          -> RAG-powered knowledge recommendations
  5. ResponseAgent           -> suggested agent response
  6. CoachingAgent           -> tone & clarity evaluation + communication improvement tips
  7. EscalationAgent         -> escalation risk score (0-100), reasoning, resolution strategies
  8. SummaryAgent            -> turn summary & post-session report generator
"""
from agents.retrieval_agent import RetrievalAgent
from agents.sentiment_agent import SentimentAgent
from agents.language_agent import LanguageAgent
from agents.escalation_agent import EscalationAgent
from agents.response_agent import ResponseAgent
from agents.coaching_agent import CoachingAgent
from agents.summary_agent import SummaryAgent
from agents.simulator_agent import CustomerSimulatorAgent


class AgentOrchestrator:
    def __init__(self):
        self.retrieval_agent = RetrievalAgent()
        self.sentiment_agent = SentimentAgent()
        self.language_agent = LanguageAgent()
        self.escalation_agent = EscalationAgent()
        self.response_agent = ResponseAgent()
        self.coaching_agent = CoachingAgent()
        self.summary_agent = SummaryAgent()
        self.simulator_agent = CustomerSimulatorAgent()

    def analyze_turn(self, customer_message: str, prior_frustration: float = None, conversation_history: list[dict] = None) -> dict:
        """Runs the complete multi-agent coaching pipeline on a customer turn."""
        # 1. RAG Retrieval Agent
        retrieval_result = self.retrieval_agent.run(question=customer_message)

        # 2. Intent & Sentiment Agent
        sentiment_result = self.sentiment_agent.run(text=customer_message, prior_frustration=prior_frustration)

        # 3. Language Agent
        language_result = self.language_agent.run(text=customer_message)

        # 4. Escalation Risk Monitor Agent
        escalation_result = self.escalation_agent.run(
            question=customer_message,
            sentiment=sentiment_result["sentiment"],
            frustration_level=sentiment_result["frustration_level"]
        )

        # 5. Response Suggestion Agent
        response_result = self.response_agent.run(
            question=customer_message,
            context_text=retrieval_result["context_text"],
            has_context=retrieval_result["has_context"],
            tone_hint=sentiment_result["suggested_tone"],
            conversation_history=conversation_history or []
        )

        # 6. Coaching & Tone Evaluation Agent
        coaching_result = self.coaching_agent.run(
            customer_message=customer_message,
            suggested_response=response_result["response_text"],
            sentiment=sentiment_result["sentiment"],
            frustration_level=sentiment_result["frustration_level"]
        )

        # 7. Summary Agent
        summary_result = self.summary_agent.run(
            question=customer_message,
            response_text=response_result["response_text"]
        )

        return {
            "retrieval": retrieval_result,
            "sentiment": sentiment_result,
            "language": language_result,
            "escalation": escalation_result,
            "response": response_result,
            "coaching": coaching_result,
            "summary": summary_result,
        }

    def simulate_customer_message(self, scenario_title: str, product_context: str, customer_persona: str, conversation_history: list[dict] = None) -> str:
        """Calls Customer Simulator Agent to generate next turn message."""
        return self.simulator_agent.run(
            scenario_title=scenario_title,
            product_context=product_context,
            customer_persona=customer_persona,
            conversation_history=conversation_history or []
        )


_orchestrator_singleton: AgentOrchestrator | None = None


def get_orchestrator() -> AgentOrchestrator:
    global _orchestrator_singleton
    if _orchestrator_singleton is None:
        _orchestrator_singleton = AgentOrchestrator()
    return _orchestrator_singleton
