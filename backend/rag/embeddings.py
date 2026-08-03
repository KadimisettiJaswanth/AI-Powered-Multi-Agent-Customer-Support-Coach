"""Sentence Transformer Embeddings stage of the RAG pipeline."""
from functools import lru_cache
from sentence_transformers import SentenceTransformer

from config import settings


@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    # Loaded once and cached — loading this model is the expensive part.
    return SentenceTransformer(settings.EMBEDDING_MODEL)


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_embedding_model()
    vectors = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return vectors.tolist()


def embed_query(query: str) -> list[float]:
    return embed_texts([query])[0]
