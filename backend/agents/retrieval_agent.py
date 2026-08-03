from agents.base import BaseAgent
from rag.vector_store import get_vector_store
from config import settings


class RetrievalAgent(BaseAgent):
    """
    Agent 1: Knowledge Retrieval Agent.
    Searches ChromaDB, retrieves top-K chunks, returns context.
    Never allows the pipeline to proceed without attempting retrieval first.
    """
    name = "retrieval_agent"

    def run(self, question: str, top_k: int | None = None) -> dict:
        store = get_vector_store()
        hits = store.similarity_search(question, top_k=top_k or settings.TOP_K)
        context_text = "\n\n---\n\n".join(h["text"] for h in hits) if hits else ""
        return {
            "hits": hits,
            "context_text": context_text,
            "has_context": len(hits) > 0,
        }
