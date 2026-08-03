import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from config import settings
from database.db import get_db
from database.models import User, KnowledgeDocument
from schemas.schemas import DocumentOut
from auth.dependencies import get_current_user, require_roles
from rag.pipeline import ingest_document
from rag.vector_store import get_vector_store
from utils.audit import log_action

router = APIRouter(tags=["knowledge-base"])

_ALLOWED_TYPES = {"pdf", "docx", "txt"}


@router.post("/upload", response_model=DocumentOut)
def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("agent", "manager", "admin")),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}. Allowed: pdf, docx, txt")

    contents = file.file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_MB:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.MAX_UPLOAD_MB}MB limit")

    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as f:
        f.write(contents)

    chunk_count = ingest_document(
        document_id=doc_id, document_name=file.filename, file_path=file_path, file_type=ext
    )

    doc = KnowledgeDocument(
        id=doc_id,
        filename=file.filename,
        file_path=file_path,
        file_type=ext,
        uploaded_by=current_user.id,
        chunk_count=chunk_count,
    )
    db.add(doc)
    log_action(db, current_user.id, "document_uploaded", f"filename={file.filename}; chunks={chunk_count}")
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()).all()


@router.delete("/document/{document_id}")
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("manager", "admin")),
):
    doc = db.query(KnowledgeDocument).filter(KnowledgeDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    get_vector_store().delete_document(document_id)
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    log_action(db, current_user.id, "document_deleted", f"filename={doc.filename}; document_id={document_id}")
    db.delete(doc)
    db.commit()
    return {"detail": "Document deleted", "document_id": document_id}
