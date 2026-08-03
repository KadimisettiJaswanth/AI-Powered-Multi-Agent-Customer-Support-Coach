"""
ChromaDB Vector Store wrapper.

Stores: chunk text + embedding + metadata (document name, page number, chunk id).
Persistent storage, similarity search, metadata filtering, top-k retrieval.
"""
import uuid
import chromadb

from config import settings
from rag.embeddings import embed_texts, embed_query


class VectorStore:
    def __init__(self):
        self.client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        self.collection = self.client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )

    def add_document_chunks(self, document_id: str, document_name: str, chunks: list[str]) -> int:
        if not chunks:
            return 0
        embeddings = embed_texts(chunks)
        ids = [f"{document_id}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "document_id": document_id,
                "document_name": document_name,
                "chunk_id": ids[i],
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
        )
        return len(chunks)

    def similarity_search(self, query: str, top_k: int | None = None, where: dict | None = None):
        top_k = top_k or settings.TOP_K
        query_embedding = embed_query(query)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
        )
        hits = []
        if results.get("documents") and results["documents"][0]:
            for i in range(len(results["documents"][0])):
                distance = results["distances"][0][i] if results.get("distances") else None
                # cosine distance -> similarity score (higher = more similar)
                score = 1 - distance if distance is not None else 0.0
                hits.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "score": round(float(score), 4),
                })
        return hits

    def delete_document(self, document_id: str):
        self.collection.delete(where={"document_id": document_id})


_vector_store_singleton: VectorStore | None = None


def get_vector_store() -> VectorStore:
    global _vector_store_singleton
    if _vector_store_singleton is None:
        _vector_store_singleton = VectorStore()
    return _vector_store_singleton
