"""Server-side auth: opaque session tokens stored in the database.

Every protected route resolves the current user and their organization here;
all downstream queries are scoped by organization_id.
"""

from datetime import datetime, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models import Organization, SessionToken, User


def _extract_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return token


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token = _extract_token(authorization)
    session = db.scalar(select(SessionToken).where(SessionToken.token == token))
    if session is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


def get_current_organization(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Organization:
    organization = db.get(Organization, user.organization_id)
    if organization is None:
        raise HTTPException(status_code=403, detail="Organization not found for user")
    return organization
