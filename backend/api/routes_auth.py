from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User, RoleEnum
from schemas.schemas import UserRegister, UserLogin, Token, UserOut, UserUpdateMe
from auth.auth import hash_password, verify_password, create_access_token
from auth.dependencies import get_current_user, require_roles
from utils.rate_limit import rate_limit
from utils.audit import log_action

router = APIRouter(tags=["auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", max_requests=10, window_seconds=60))],
)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        role = RoleEnum(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="role must be one of: agent, manager, admin")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=role,
    )
    db.add(user)
    db.flush()
    log_action(db, user.id, "user_registered", f"role={role.value}")
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=Token,
    dependencies=[Depends(rate_limit("login", max_requests=10, window_seconds=60))],
)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        # Deliberately not audit-logging the attempted email on failure to
        # avoid storing arbitrary user-supplied strings tied to "auth failure"
        # in a table admins can browse -- that's an easy log-injection/PII trap.
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": user.id, "role": user.role.value})
    log_action(db, user.id, "user_login")
    db.commit()
    return Token(access_token=token, role=user.role.value)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    payload: UserUpdateMe,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    changes = []
    if payload.email and payload.email != current_user.email:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = payload.email
        changes.append("email")
    
    if payload.full_name and payload.full_name != current_user.full_name:
        current_user.full_name = payload.full_name
        changes.append("full_name")
        
    if payload.password:
        current_user.hashed_password = hash_password(payload.password)
        changes.append("password")
        
    if changes:
        log_action(db, current_user.id, "user_self_updated", f"Updated: {', '.join(changes)}")
        db.commit()
        db.refresh(current_user)
        
    return current_user


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.put("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    role: str | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    changes = []
    if role is not None:
        try:
            user.role = RoleEnum(role)
            changes.append(f"role->{role}")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
    if is_active is not None:
        user.is_active = is_active
        changes.append(f"is_active->{is_active}")
    if changes:
        log_action(db, current_user.id, "user_updated", f"target={user.id}; {', '.join(changes)}")
    db.commit()
    db.refresh(user)
    return user
