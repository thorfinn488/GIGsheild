from __future__ import annotations

import datetime as dt
import random

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Claim, Payout, Worker
from app.routes.common import get_current_user
from app.schemas import PayoutItem


router = APIRouter(prefix="/api/payouts", tags=["payouts"])


@router.post("/initiate")
def initiate_payout(payload: dict, current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    claim_id = int(payload.get("claim_id", -1))
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.worker_id == current.id).first()
    if not claim:
        return {"ok": False, "detail": "Claim not found"}
    if claim.status != "approved":
        return {"ok": False, "detail": f"Claim status is {claim.status}"}

    existing = db.query(Payout).filter(Payout.claim_id == claim.id).first()
    if existing:
        return {"ok": True, "payout_id": existing.id}

    razorpay_ref = f"rzp_demo_{claim.id}_{random.randint(1000,9999)}"
    payout = Payout(
        claim_id=claim.id,
        worker_id=current.id,
        amount=int(claim.income_lost),
        upi_id=current.upi_id,
        razorpay_ref=razorpay_ref,
        processed_at=dt.datetime.utcnow(),
        time_to_pay_seconds=480,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    return {"ok": True, "payout_id": payout.id, "razorpay_ref": payout.razorpay_ref}


@router.get("/history", response_model=list[PayoutItem])
def payout_history(
    month: str | None = Query(default=None),
    current: Worker = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = dt.datetime.utcnow()
    if month in {"this", "current", "this_month"}:
        since = now - dt.timedelta(days=30)
    else:
        since = now - dt.timedelta(days=365)

    payouts = (
        db.query(Payout)
        .filter(Payout.worker_id == current.id, Payout.processed_at >= since)
        .order_by(Payout.processed_at.desc())
        .limit(80)
        .all()
    )
    return [
        PayoutItem(id=p.id, amount=p.amount, status="processed", processedAt=p.processed_at)
        for p in payouts
    ]

