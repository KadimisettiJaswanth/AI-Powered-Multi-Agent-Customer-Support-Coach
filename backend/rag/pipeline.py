"""
Full ingestion pipeline:
Upload -> Document Loader -> Cleaning -> Recursive Chunking -> Embeddings -> ChromaDB
"""
from rag.document_loader import load_document_text, clean_text
from rag.chunking import chunk_text
from rag.vector_store import get_vector_store


def ingest_document(document_id: str, document_name: str, file_path: str, file_type: str) -> int:
    """Runs the full ingestion pipeline for one uploaded file. Returns chunk count."""
    raw_text = load_document_text(file_path, file_type)
    cleaned = clean_text(raw_text)
    chunks = chunk_text(cleaned)
    store = get_vector_store()
    return store.add_document_chunks(document_id, document_name, chunks)
