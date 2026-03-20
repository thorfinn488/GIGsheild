import datetime as dt

from app.db import SessionLocal, engine
from app.models import Base, Claim, Payout, Policy, Trigger, Worker


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Clear existing (simple reseed).
        db.query(Payout).delete()
        db.query(Claim).delete()
        db.query(Trigger).delete()
        db.query(Policy).delete()
        db.query(Worker).delete()
        db.commit()

        workers = [
            Worker(
                name="Ravi Kumar",
                mobile="9199000000",
                zone="Mumbai — Andheri West",
                city="Mumbai",
                platform="Zomato",
                vehicle_type="Motorcycle",
                upi_id="ravi@paytm",
                weekly_earnings=4200,
                risk_score=68,
                is_admin=False,
            ),
            Worker(
                name="Suresh Nair",
                mobile="9199000001",
                zone="Delhi — Connaught Place",
                city="Delhi",
                platform="Swiggy",
                vehicle_type="Bicycle",
                upi_id="suresh@upi",
                weekly_earnings=5000,
                risk_score=62,
                is_admin=False,
            ),
            Worker(
                name="Karthik Iyer",
                mobile="9199000002",
                zone="Bengaluru — Koramangala",
                city="Bengaluru",
                platform="Amazon",
                vehicle_type="EV Scooter",
                upi_id="karthik@upi",
                weekly_earnings=3600,
                risk_score=55,
                is_admin=False,
            ),
            Worker(
                name="Meera Rao",
                mobile="9199000003",
                zone="Chennai — T. Nagar",
                city="Chennai",
                platform="Blinkit",
                vehicle_type="Motorcycle",
                upi_id="meera@upi",
                weekly_earnings=4100,
                risk_score=58,
                is_admin=False,
            ),
            Worker(
                name="Admin",
                mobile="91990000000000",
                zone="Mumbai — Andheri West",
                city="Mumbai",
                platform="Zomato",
                vehicle_type="Motorcycle",
                upi_id="admin@upi",
                weekly_earnings=0,
                risk_score=70,
                is_admin=True,
            ),
        ]
        db.add_all(workers)
        db.commit()
        for w in workers:
            db.refresh(w)

        today = dt.date.today()

        # Active policies for 4 workers.
        policies = [
            Policy(worker_id=workers[0].id, weekly_premium=79, coverage_amount=4200, start_date=today, end_date=today + dt.timedelta(days=6), status="active", tier="Standard", weekly_earnings=4200),
            Policy(worker_id=workers[1].id, weekly_premium=49, coverage_amount=2000, start_date=today, end_date=today + dt.timedelta(days=6), status="active", tier="Starter", weekly_earnings=2600),
            Policy(worker_id=workers[2].id, weekly_premium=79, coverage_amount=4200, start_date=today, end_date=today + dt.timedelta(days=6), status="active", tier="Standard", weekly_earnings=3900),
            Policy(worker_id=workers[3].id, weekly_premium=120, coverage_amount=7000, start_date=today, end_date=today + dt.timedelta(days=6), status="active", tier="Pro", weekly_earnings=6100),
        ]
        db.add_all(policies)
        db.commit()

        # Historical triggers + claims + payouts.
        trigger_types = [
            ("Heavy Rainfall", "IMD API", "> 50mm/hr"),
            ("Severe AQI Spike", "CPCB National API", "AQI > 300 (Severe+)"),
            ("Flood Alert", "IMD + NDMA", "NDMA Red Alert"),
            ("Administrative Curfew", "State Govt / Police", "Gov advisory active"),
            ("City-wide Strike", "Traffic + News APIs", "> 70% traffic drop"),
            ("Extreme Heat Wave", "IMD Heat Advisory", "Temp > 42C (12-4pm)"),
        ]

        triggers = []
        for i in range(10):
            t_type, ds, thr = trigger_types[i % len(trigger_types)]
            worker = workers[i % 4]
            fired = dt.datetime.utcnow() - dt.timedelta(days=30 - i * 3, minutes=i * 7)
            actual_value = None
            status = "PAYOUT" if i % 3 != 0 else "MONITORING"
            if t_type == "Heavy Rainfall":
                actual_value = 60 + i * 2
            elif t_type == "Severe AQI Spike":
                actual_value = 280 + i * 15
            elif t_type == "City-wide Strike":
                actual_value = 60 + i * 4
            elif t_type == "Extreme Heat Wave":
                actual_value = 40 + i * 0.6

            triggers.append(
                Trigger(
                    trigger_type=t_type,
                    zone=worker.zone,
                    city=worker.city,
                    severity="high",
                    threshold=thr,
                    actual_value=actual_value,
                    data_source=ds,
                    status=status,
                    fired_at=fired,
                    cleared_at=fired + dt.timedelta(minutes=6) if status != "MONITORING" else None,
                )
            )
        db.add_all(triggers)
        db.commit()

        # Claims/payouts for payout triggers.
        payouts = []
        claims = []
        for trig in db.query(Trigger).order_by(Trigger.fired_at.asc()).all():
            worker = db.query(Worker).filter(Worker.zone == trig.zone, Worker.is_admin == False).first()
            if not worker or trig.status not in {"PAYOUT", "ACTIVE"}:
                continue
            policy = db.query(Policy).filter(Policy.worker_id == worker.id, Policy.status == "active").first()
            weekly_cov = policy.coverage_amount if policy else 4200
            # Fake income lost.
            daily = int(round(weekly_cov / 7))
            income_lost = daily if trig.trigger_type in {"Heavy Rainfall", "Flood Alert", "Administrative Curfew"} else int(round(daily * 0.6))
            fraud_score = 0.15 if trig.id % 4 != 0 else 0.72
            status = "approved" if fraud_score < 0.35 else "rejected"

            claim = Claim(
                worker_id=worker.id,
                trigger_id=trig.id,
                income_lost=income_lost,
                fraud_score=fraud_score,
                status=status,
                validated_at=dt.datetime.utcnow(),
            )
            db.add(claim)
            db.flush()
            if status == "approved":
                payouts.append(
                    Payout(
                        claim_id=claim.id,
                        worker_id=worker.id,
                        amount=income_lost,
                        upi_id=worker.upi_id,
                        razorpay_ref=f"rzp_demo_{claim.id}",
                        processed_at=dt.datetime.utcnow(),
                        time_to_pay_seconds=480,
                    )
                )
        db.add_all(payouts)
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed complete.")

