from __future__ import annotations

import datetime as dt
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml.risk_scorer import compute_zone_risk_score
from app.models import Claim, Payout, Policy, Trigger, Worker
from app.routes.common import get_current_user
from app.schemas import AdminStatsResponse, FraudPatternResponse, PredictionDayResponse


router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(current: Worker):
    if not current.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")


@router.get("/stats", response_model=AdminStatsResponse)
def admin_stats(current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(current)

    active_policies = db.query(func.count(Policy.id)).filter(Policy.status == "active").scalar() or 0
    weekly_premium_pool = db.query(func.coalesce(func.sum(Policy.weekly_premium), 0)).filter(Policy.status == "active").scalar() or 0

    # Loss ratio approx (mock): payouts in last 30 days / premium pool for active policies (scaled).
    since = dt.datetime.utcnow() - dt.timedelta(days=30)
    payout_total = (
        db.query(func.coalesce(func.sum(Payout.amount), 0)).filter(Payout.processed_at >= since).scalar() or 0
    )
    loss_ratio = (payout_total / max(1, weekly_premium_pool)) * 100 * 1.2  # scaled for UI friendliness
    loss_ratio_pct = round(max(0.0, min(80.0, loss_ratio)), 1)

    rejected_claims_amount = (
        db.query(func.coalesce(func.sum(Claim.income_lost), 0))
        .filter(Claim.status == "rejected")
        .scalar()
        or 0
    )

    return AdminStatsResponse(
        activePolicies=int(active_policies),
        lossRatioPct=loss_ratio_pct,
        fraudBlockedRupees=int(rejected_claims_amount),
        weeklyPremiumPoolRupees=int(weekly_premium_pool),
    )


@router.get("/fraud", response_model=list[FraudPatternResponse])
def admin_fraud(current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(current)

    rejected = db.query(Claim).filter(Claim.status == "rejected").all()
    rejected_count = len(rejected)
    # Mock breakdown patterns; show deterministic-ish distribution.
    base = max(10, rejected_count)
    return [
        FraudPatternResponse(pattern="GPS Spoofing", count=int(round(base * 0.34))),
        FraudPatternResponse(pattern="Duplicate Claims", count=int(round(base * 0.25))),
        FraudPatternResponse(pattern="Zone Mismatch", count=int(round(base * 0.22))),
        FraudPatternResponse(pattern="Inactive During Claim", count=int(round(base * 0.19))),
    ]


@router.get("/predictions", response_model=list[PredictionDayResponse])
def admin_predictions(current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    require_admin(current)
    # Use a "city risk" baseline from the current admin default zone.
    baseline = compute_zone_risk_score(current.zone, weekly_earnings=current.weekly_earnings or 4200)
    now = dt.date.today()

    results: list[PredictionDayResponse] = []
    for i in range(7):
        d = now + dt.timedelta(days=i)
        # Smooth wave + small jitter.
        wave = 6 * (1 + __import__("math").sin(i / 2))
        jitter = (abs(hash(f"{current.zone}-{i}")) % 9) - 4
        risk = int(max(5, min(98, round(baseline * 0.9 + wave + jitter))))

        level = "Low" if risk < 45 else "Moderate" if risk < 70 else "High"
        results.append(
            PredictionDayResponse(day=f"{d.strftime('%a')} {d.day}", riskPct=risk, level=level)  # type: ignore[arg-type]
        )
    return results

