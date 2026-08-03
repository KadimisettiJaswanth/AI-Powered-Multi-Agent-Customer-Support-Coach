from agents.base import BaseAgent
from llm.provider import get_llm_provider

SYSTEM_PROMPT = "You write concise, professional summaries and post-session coaching evaluations for customer support interactions."


class SummaryAgent(BaseAgent):
    """
    Agent 6: Post-Interaction Summary Agent.
    Generates interaction summary, customer sentiment journey timeline,
    resolution quality score, and personalized agent coaching recommendations.
    """
    name = "summary_agent"

    def run(self, question: str, response_text: str) -> dict:
        user_prompt = (
            f"Customer asked: {question}\n"
            f"Agent/AI responded: {response_text}\n\n"
            f"Write a one-sentence internal summary (max 25 words) of what happened."
        )
        llm = get_llm_provider()
        try:
            summary = llm.generate(SYSTEM_PROMPT, user_prompt).strip()
        except Exception:
            summary = f"Customer asked about {question[:30]}... and received support response."
        return {"summary": summary}

    def generate_post_session_report(self, session_title: str, turns: list[dict]) -> dict:
        """Generates full post-interaction report across all turns of a coaching session."""
        sentiment_journey = []
        avg_frustration = 0.0
        avg_tone_score = 0.0

        for t in turns:
            sentiment_journey.append({
                "turn": t.get("turn_index", 1),
                "sentiment": t.get("sentiment", "neutral"),
                "frustration": t.get("frustration_level", 20.0),
                "escalation_score": t.get("escalation_score", 10.0),
            })
            avg_frustration += t.get("frustration_level", 20.0)
            avg_tone_score += t.get("tone_clarity_score", 80.0)

        num_turns = max(len(turns), 1)
        avg_frustration /= num_turns
        avg_tone_score /= num_turns

        # Resolution Quality Score: weighted formula of initial vs final frustration + tone quality
        initial_frustration = turns[0].get("frustration_level", 50.0) if turns else 50.0
        final_frustration = turns[-1].get("frustration_level", 20.0) if turns else 20.0
        frustration_de_escalation = max(initial_frustration - final_frustration, 0)

        resolution_quality_score = min(round((avg_tone_score * 0.5) + (frustration_de_escalation * 0.3) + 30.0, 1), 100.0)

        # Generate personalized recommendations
        recommendations = []
        if avg_frustration > 60:
            recommendations.append("Acknowledge customer emotion and validate frustration earlier in turn 1.")
        else:
            recommendations.append("Maintained calm de-escalation tone effectively throughout interaction.")

        if avg_tone_score < 75:
            recommendations.append("Provide clear step-by-step resolution timelines to reduce customer anxiety.")
        else:
            recommendations.append("Clear communication and good use of retrieved knowledge base articles.")

        recommendations.append("Ensure follow-up confirmation is requested before closing session.")

        summary_text = f"Coaching session '{session_title}' completed in {len(turns)} turns with resolution score {resolution_quality_score}/100."

        return {
            "summary": summary_text,
            "resolution_quality_score": resolution_quality_score,
            "sentiment_journey": sentiment_journey,
            "coaching_recommendations": recommendations,
            "metrics": {
                "avg_frustration": round(avg_frustration, 1),
                "avg_tone_score": round(avg_tone_score, 1),
                "total_turns": len(turns),
            }
        }
