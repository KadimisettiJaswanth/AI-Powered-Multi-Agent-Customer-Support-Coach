"""Recursive Chunking stage of the RAG pipeline."""
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings


def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    return splitter.split_text(text)
