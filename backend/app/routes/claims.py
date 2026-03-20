from __future__ import annotations

import datetime as dt
import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml.fraud_model import fraud_probability, is_fraud
from app.models import Claim, Policy, Trigger, Worker, Payout
from app.routes.common import get_current_user
from app.schemas import ClaimItem


router = APIRouter(prefix="/api/claims", tags=["claims"])


def _daily_income(coverage_amount: int) -> int:
    return max(0, int(round(coverage_amount / 7)))


def _income_lost_for_trigger(trigger_type: str, weekly_coverage: int) -> int:
    daily = _daily_income(weekly_coverage)
    if trigger_type in {"Heavy Rainfall", "Flood Alert", "Administrative Curfew"}:
        return daily
    if trigger_type == "Severe AQI Spike":
        return int(round(daily * 0.6))
    if trigger_type == "City-wide Strike":
        return int(round(daily * 0.85))
    if trigger_type == "Extreme Heat Wave":
        return int(round(daily * (4 / 24)))
    return int(round(daily * 0.5))


def _validate_and_set_claim(db: Session, claim: Claim, worker: Worker, trigger: Trigger) -> None:
    active_policy = (
        db.query(Policy)
        .filter(Policy.worker_id == worker.id, Policy.status == "active")
        .order_by(Policy.start_date.desc())
        .first()
    )
    weekly_coverage = active_policy.coverage_amount if active_policy else 4200
    claim.income_lost = _income_lost_for_trigger(trigger.trigger_type, weekly_coverage)

    zone_match = worker.zone == trigger.zone

    # Mock GPS: if trigger is a monitoring/payout-like event, assume some probability.
    gps_active_during_event = random.random() > (0.25 if zone_match else 0.05)

    account_age_days = max(1, (dt.datetime.utcnow() - worker.created_at).days)
    claims_in_30_days = (
        db.query(Claim)
        .filter(Claim.worker_id == worker.id, Claim.created_at >= dt.datetime.utcnow() - dt.timedelta(days=30))
        .count()
    )
    distance_km = 0.8 if zone_match else 18.0

    prob = fraud_probability(
        gps_active_during_event=gps_active_during_event,
        zone_match=zone_match,
        account_age_days=account_age_days,
        claims_in_30_days=claims_in_30_days,
        distance_from_claimed_zone_km=distance_km,
    )
    claim.fraud_score = float(prob)
    fraud = is_fraud(prob)

    claim.status = "approved" if not fraud else "rejected"
    claim.validated_at = dt.datetime.utcnow()

    db.commit()
    db.refresh(claim)


@router.get("/my", response_model=list[ClaimItem])
def my_claims(current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    claims = (
        db.query(Claim)
        .filter(Claim.worker_id == current.id)
        .order_by(Claim.created_at.desc())
        .limit(40)
        .all()
    )
    # Map statuses to UI-friendly enum strings.
    status_map = {"approved": "APPROVED", "rejected": "REJECTED", "pending": "PENDING"}
    return [
        ClaimItem(
            id=c.id,
            status=status_map.get(c.status, "PENDING"),
            fraudScore=c.fraud_score,
            createdAt=c.created_at,
        )
        for c in claims
    ]


@router.post("/validate")
def validate_claim_internal(payload: dict, current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    # Expected payload: { "claim_id": int }
    claim_id = int(payload.get("claim_id", -1))
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.worker_id == current.id).first()
    if not claim:
        return {"ok": False, "detail": "Claim not found"}
    trigger = db.query(Trigger).filter(Trigger.id == claim.trigger_id).first()
    if not trigger:
        return {"ok": False, "detail": "Trigger not found"}

    _validate_and_set_claim(db, claim, current, trigger)
    return {"ok": True, "claim_id": claim.id, "status": claim.status, "fraud_score": claim.fraud_score}


@router.get("/status/{id}")
def claim_status(id: int, current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == id, Claim.worker_id == current.id).first()
    if not claim:
        return {"ok": False}
    return {"id": claim.id, "status": claim.status, "fraudScore": claim.fraud_score}

