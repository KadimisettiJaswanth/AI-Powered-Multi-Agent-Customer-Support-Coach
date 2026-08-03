"""Document Loader + Cleaning stage of the RAG pipeline."""
import re
from pathlib import Path

from pypdf import PdfReader
import docx


def load_document_text(file_path: str, file_type: str) -> str:
    """Loads raw text from pdf/docx/txt files."""
    file_type = file_type.lower()
    if file_type == "pdf":
        return _load_pdf(file_path)
    if file_type == "docx":
        return _load_docx(file_path)
    if file_type == "txt":
        return Path(file_path).read_text(encoding="utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type: {file_type}")


def _load_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append(f"[page {i + 1}]\n{text}")
    return "\n\n".join(pages)


def _load_docx(file_path: str) -> str:
    d = docx.Document(file_path)
    return "\n".join(p.text for p in d.paragraphs)


def clean_text(raw_text: str) -> str:
    """Document Cleaning stage: normalize whitespace, strip control chars."""
    text = raw_text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
