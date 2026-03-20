from __future__ import annotations

import datetime as dt
import random

from fastapi import APIRouter, Depends

from app.db import get_db
from app.models import Worker
from app.routes.common import get_current_user
from app.security import create_access_token
from app.schemas import AuthTokenResponse, SendOtpRequest, VerifyOtpRequest


router = APIRouter(prefix="/api/auth", tags=["auth"])

# Phase-1 mock OTP store (in-memory).
OTP_STORE: dict[str, tuple[str, dt.datetime]] = {}

DEFAULT_ZONE = "Mumbai — Andheri West"
DEFAULT_CITY = "Mumbai"


def _is_admin_mobile(mobile: str) -> bool:
    # Demo-only rule: a special mobile pattern becomes admin.
    return mobile.endswith("0000")


@router.post("/send-otp")
def send_otp(req: SendOtpRequest, db=Depends(get_db)) -> dict:
    otp = "1234"  # stable demo OTP
    # otp = f"{random.randint(0,9999):04d}"  # could randomize in real flow
    expires_at = dt.datetime.utcnow() + dt.timedelta(seconds=300)
    OTP_STORE[req.mobile] = (otp, expires_at)
    return {"success": True, "otp": otp, "expiresIn": 300}


@router.post("/verify-otp", response_model=AuthTokenResponse)
def verify_otp(req: VerifyOtpRequest, db=Depends(get_db)) -> AuthTokenResponse:
    stored = OTP_STORE.get(req.mobile)
    if not stored:
        raise ValueError("OTP not requested")
    otp, expires_at = stored
    if dt.datetime.utcnow() > expires_at or req.otp != otp:
        raise ValueError("Invalid OTP")

    worker = db.query(Worker).filter(Worker.mobile == req.mobile).first()
    role = "admin" if _is_admin_mobile(req.mobile) else "worker"
    if not worker:
        worker = Worker(
            name="Gig Worker",
            mobile=req.mobile,
            zone=DEFAULT_ZONE,
            city=DEFAULT_CITY,
            platform="Zomato",
            vehicle_type="Motorcycle",
            upi_id="ravi@paytm",
            weekly_earnings=4200,
            risk_score=60,
            is_admin=(role == "admin"),
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)
    else:
        worker.is_admin = role == "admin"
        db.commit()

    token = create_access_token(subject=worker.id, role=role)
    return AuthTokenResponse(access_token=token, user_id=worker.id, role=role)


@router.get("/me")
def me(current: Worker = Depends(get_current_user)):
    # Import hack to keep this file compact while using the shared dependency.
    return {
        "id": current.id,
        "name": current.name,
        "zone": current.zone,
        "city": current.city,
        "platform": current.platform,
        "upi_id": current.upi_id,
        "weekly_earnings": current.weekly_earnings,
        "risk_score": current.risk_score,
        "is_admin": current.is_admin,
    }

