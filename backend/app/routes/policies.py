from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.ml.premium_model import premium_calc
from app.ml.risk_scorer import compute_zone_risk_score, risk_breakdown_from_score
from app.models import Policy, Worker
from app.routes.common import get_current_user
from app.schemas import PolicyResponse, PolicySummary


router = APIRouter(prefix="/api/policies", tags=["policies"])


def parse_city_zone(cityZone: str) -> tuple[str, str]:
    # Expected: "City — Zone"
    if "—" in cityZone:
        city, zone = cityZone.split("—", 1)
        return city.strip(), zone.strip()
    if "-" in cityZone:
        city, zone = cityZone.split("-", 1)
        return city.strip(), zone.strip()
    return cityZone.strip(), cityZone.strip()


@router.post("/create", response_model=PolicyResponse)
def create_policy(req: dict, current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    # Keep schema-free internally to reduce file count; frontend sends exactly the fields from CreatePolicyRequest.
    name = req.get("name")
    mobile = req.get("mobile")
    cityZone = req.get("cityZone")
    platform = req.get("platform")
    vehicleType = req.get("vehicleType")
    upiId = req.get("upiId")
    weeklyEarnings = int(req.get("weeklyEarnings", 4200))

    city, zone = parse_city_zone(cityZone)

    # Zone risk + ML premium (mock).
    zone_risk = compute_zone_risk_score(zone, weeklyEarnings)
    breakdown = risk_breakdown_from_score(zone, zone_risk)

    premium_result = premium_calc(zone_risk_score=zone_risk, weekly_earnings=weeklyEarnings, platform=platform)

    start = dt.date.today()
    end = start + dt.timedelta(days=6)

    # Expire any active policies.
    for p in db.query(Policy).filter(Policy.worker_id == current.id, Policy.status == "active").all():
        p.status = "expired"
        p.end_date = start

    policy = Policy(
        worker_id=current.id,
        weekly_premium=premium_result.weekly_premium,
        coverage_amount=premium_result.weekly_coverage,
        start_date=start,
        end_date=end,
        status="active",
        tier=premium_result.tier,
        weekly_earnings=weeklyEarnings,
    )
    db.add(policy)

    # Update worker profile fields.
    current.name = name or current.name
    current.mobile = mobile or current.mobile
    current.zone = zone
    current.city = city
    current.platform = platform
    current.vehicle_type = vehicleType
    current.upi_id = upiId
    current.weekly_earnings = weeklyEarnings
    current.risk_score = zone_risk
    db.commit()
    db.refresh(policy)

    days_remaining = max(0, (policy.end_date - dt.date.today()).days)

    return PolicyResponse(
        policyId=policy.id,
        tier=policy.tier,
        weeklyPremium=policy.weekly_premium,
        weeklyCoverage=policy.coverage_amount,
        zoneRiskScore=zone_risk,
        breakdown=breakdown,
        zoneLabel=zone,
        platform=platform,
        daysRemaining=days_remaining,
    )


@router.get("/my", response_model=PolicySummary)
def my_policy(current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    policy = (
        db.query(Policy)
        .filter(Policy.worker_id == current.id, Policy.status == "active")
        .order_by(Policy.start_date.desc())
        .first()
    )
    if not policy:
        # Create a default inactive response (frontend can handle).
        return PolicySummary(id=-1, weeklyCoverage=0, weeklyPremium=0, daysRemaining=0)

    return PolicySummary(id=policy.id, weeklyCoverage=policy.coverage_amount, weeklyPremium=policy.weekly_premium, daysRemaining=max(0, (policy.end_date - dt.date.today()).days))


@router.post("/renew")
def renew_policy(current: Worker = Depends(get_current_user), db: Session = Depends(get_db)):
    # For prototype: renew using existing worker profile fields.
    req = {
        "name": current.name,
        "mobile": current.mobile,
        "cityZone": f"{current.city} — {current.zone}",
        "platform": current.platform,
        "vehicleType": current.vehicle_type,
        "upiId": current.upi_id,
        "weeklyEarnings": current.weekly_earnings,
    }
    return create_policy(req, current=current, db=db)

