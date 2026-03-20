from __future__ import annotations

import fastapi
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Worker
from app.security import decode_token


def require_auth(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise fastapi.HTTPException(status_code=401, detail="Missing Bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        return decode_token(token)
    except Exception as e:
        raise fastapi.HTTPException(status_code=401, detail=f"Invalid token: {e}")


def get_current_user(
    payload: dict = Depends(require_auth),
    db: Session = Depends(get_db),
) -> Worker:
    user_id = int(payload["sub"])
    user = db.query(Worker).filter(Worker.id == user_id).first()
    if not user:
        raise fastapi.HTTPException(status_code=404, detail="User not found")
    return user

