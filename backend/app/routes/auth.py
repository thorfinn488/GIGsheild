from __future__ import annotations

import datetime as dt
import os

from fastapi import APIRouter, Depends, HTTPException

from app.db import get_db
from app.models import Worker
from app.otp_utils import generate_numeric_otp, normalize_mobile, otp_length
from app.routes.common import get_current_user
from app.security import create_access_token
from app.schemas import AuthTokenResponse, SendOtpRequest, VerifyOtpRequest


router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory OTP store: normalized mobile -> (code, expiry). Replace with Redis + SMS in production.
OTP_STORE: dict[str, tuple[str, dt.datetime]] = {}
_LAST_OTP_SEND: dict[str, dt.datetime] = {}

OTP_TTL_SECONDS = 300
RESEND_COOLDOWN_SECONDS = 45

DEFAULT_ZONE = "Mumbai — Andheri West"
DEFAULT_CITY = "Mumbai"


def _is_admin_mobile(mobile: str) -> bool:
    # Demo-only rule: a special mobile pattern becomes admin.
    return mobile.endswith("0000")


def _return_otp_in_response() -> bool:
    """When false, OTP is not included in JSON (use with real SMS). Default true for local/demo."""
    return os.environ.get("RETURN_OTP_IN_RESPONSE", "true").lower() in ("1", "true", "yes")


@router.post("/send-otp")
def send_otp(req: SendOtpRequest, db=Depends(get_db)) -> dict:
    mobile = normalize_mobile(req.mobile)
    if not mobile or len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Invalid mobile number")

    now = dt.datetime.utcnow()
    last = _LAST_OTP_SEND.get(mobile)
    if last and (now - last).total_seconds() < RESEND_COOLDOWN_SECONDS:
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {RESEND_COOLDOWN_SECONDS}s before requesting another OTP",
        )

    otp = generate_numeric_otp()
    expires_at = now + dt.timedelta(seconds=OTP_TTL_SECONDS)
    OTP_STORE[mobile] = (otp, expires_at)
    _LAST_OTP_SEND[mobile] = now

    out: dict = {"success": True, "expiresIn": OTP_TTL_SECONDS, "otpLength": otp_length()}
    if _return_otp_in_response():
        out["otp"] = otp
    return out


@router.post("/verify-otp", response_model=AuthTokenResponse)
def verify_otp(req: VerifyOtpRequest, db=Depends(get_db)) -> AuthTokenResponse:
    mobile = normalize_mobile(req.mobile)
    entered = "".join(req.otp.split())
    stored = OTP_STORE.get(mobile)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not requested for this number")
    otp, expires_at = stored
    if dt.datetime.utcnow() > expires_at or entered != otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    worker = db.query(Worker).filter(Worker.mobile == mobile).first()
    OTP_STORE.pop(mobile, None)

    role = "admin" if _is_admin_mobile(mobile) else "worker"
    if not worker:
        worker = Worker(
            name="Gig Worker",
            mobile=mobile,
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

