"""Audit logging helper. Call log_action() after any sensitive/state-changing
operation (login, register, upload, delete, role change, ticket status change)."""
from sqlalchemy.orm import Session

from database.models import AuditLog


def log_action(db: Session, user_id: str | None, action: str, detail: str | None = None):
    entry = AuditLog(user_id=user_id, action=action, detail=detail)
    db.add(entry)
    # Deliberately not committing here -- caller's existing db.commit() for the
    # primary operation will persist this too, so a failed audit write can't
    # silently succeed while the real operation fails, or vice versa.
