from __future__ import annotations

import datetime as dt
import random

from celery import shared_task
from sqlalchemy import func

from app.db import SessionLocal
from app.ml.fraud_model import fraud_probability, is_fraud
from app.models import Claim, Payout, Policy, Trigger, Worker
from app.tasks.celery_app import celery_app


TRIGGER_SPECS = [
    ("Heavy Rainfall", "IMD API", "> 50mm/hr"),
    ("Severe AQI Spike", "CPCB National API", "AQI > 300 (Severe+)"),
    ("Flood Alert", "IMD + NDMA", "NDMA Red Alert"),
    ("Administrative Curfew", "State Govt / Police", "Gov advisory active"),
    ("City-wide Strike", "Traffic + News APIs", "> 70% traffic drop"),
    ("Extreme Heat Wave", "IMD Heat Advisory", "Temp > 42C (12-4pm)"),
]


def _mock_trigger_actual(trigger_type: str) -> tuple[float | None, str]:
    roll = random.random()
    if trigger_type == "Heavy Rainfall":
        actual = 30 + roll * 90
        return round(actual, 1), "PAYOUT" if actual > 50 else "MONITORING"
    if trigger_type == "Severe AQI Spike":
        actual = 120 + roll * 420
        return round(actual, 0), "PAYOUT" if actual > 300 else "MONITORING"
    if trigger_type == "Flood Alert":
        return None, "PAYOUT" if roll > 0.55 else "MONITORING"
    if trigger_type == "Administrative Curfew":
        return None, "ACTIVE" if roll > 0.6 else "MONITORING"
    if trigger_type == "City-wide Strike":
        actual = 40 + roll * 60
        return round(actual, 0), "PAYOUT" if actual > 70 else "MONITORING"
    if trigger_type == "Extreme Heat Wave":
        actual = 34 + roll * 18
        return round(actual, 1), "PAYOUT" if actual > 42 else "MONITORING"
    return None, "MONITORING"


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


@celery_app.task(name="app.tasks.trigger_poller.poll_triggers")
def poll_triggers() -> str:
    """
    Mock trigger polling + auto-claim + auto-payout.
    This runs independently of user actions.
    """
    db = SessionLocal()
    try:
        # Find zones with active policies.
        active_workers = (
            db.query(Worker)
            .join(Policy, Policy.worker_id == Worker.id)
            .filter(Policy.status == "active")
            .all()
        )

        if not active_workers:
            return "no-active-workers"

        # Group workers by zone.
        by_zone: dict[tuple[str, str], list[Worker]] = {}
        for w in active_workers:
            key = (w.city, w.zone)
            by_zone.setdefault(key, []).append(w)

        for (city, zone), workers in by_zone.items():
            # Create 1-2 triggers per poll cycle per zone.
            for trigger_type, data_source, threshold in random.sample(TRIGGER_SPECS, k=random.randint(1, 2)):
                actual_value, status = _mock_trigger_actual(trigger_type)

                if status in {"MONITORING"}:
                    continue  # only fire claims when "payout-like" events occur

                trigger = Trigger(
                    trigger_type=trigger_type,
                    zone=zone,
                    city=city,
                    severity="high",
                    threshold=threshold,
                    actual_value=actual_value,
                    data_source=data_source,
                    status=status if status in {"PAYOUT", "ACTIVE"} else "PAYOUT",
                    fired_at=dt.datetime.utcnow(),
                )
                db.add(trigger)
                db.flush()  # get trigger.id

                for worker in workers:
                    # Select current active policy to compute income lost.
                    active_policy = (
                        db.query(Policy)
                        .filter(Policy.worker_id == worker.id, Policy.status == "active")
                        .order_by(Policy.start_date.desc())
                        .first()
                    )
                    weekly_coverage = active_policy.coverage_amount if active_policy else 4200
                    income_lost = _income_lost_for_trigger(trigger_type, weekly_coverage)

                    # Fraud signals (mock).
                    zone_match = worker.zone == zone
                    gps_active_during_event = random.random() > (0.25 if zone_match else 0.05)
                    account_age_days = max(1, (dt.datetime.utcnow() - worker.created_at).days)
                    claims_in_30_days = (
                        db.query(func.count(Claim.id))
                        .filter(Claim.worker_id == worker.id, Claim.created_at >= dt.datetime.utcnow() - dt.timedelta(days=30))
                        .scalar()
                        or 0
                    )
                    distance_km = 0.8 if zone_match else 18.0

                    prob = fraud_probability(
                        gps_active_during_event=gps_active_during_event,
                        zone_match=zone_match,
                        account_age_days=account_age_days,
                        claims_in_30_days=int(claims_in_30_days),
                        distance_from_claimed_zone_km=distance_km,
                    )

                    claim = Claim(
                        worker_id=worker.id,
                        trigger_id=trigger.id,
                        income_lost=income_lost,
                        fraud_score=float(prob),
                        status="pending",
                        validated_at=None,
                        created_at=dt.datetime.utcnow(),
                    )
                    db.add(claim)
                    db.flush()

                    fraud = is_fraud(prob)
                    claim.status = "approved" if not fraud else "rejected"
                    claim.validated_at = dt.datetime.utcnow()

                    if claim.status == "approved":
                        razorpay_ref = f"rzp_demo_{claim.id}_{random.randint(1000,9999)}"
                        payout = Payout(
                            claim_id=claim.id,
                            worker_id=worker.id,
                            amount=int(claim.income_lost),
                            upi_id=worker.upi_id,
                            razorpay_ref=razorpay_ref,
                            processed_at=dt.datetime.utcnow(),
                            time_to_pay_seconds=480,
                        )
                        db.add(payout)

        db.commit()
        return "ok"
    finally:
        db.close()

