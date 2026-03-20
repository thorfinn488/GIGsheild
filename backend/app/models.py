import datetime as dt

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="Unknown")
    mobile: Mapped[str] = mapped_column(String(20), unique=True, index=True)

    zone: Mapped[str] = mapped_column(String(120), default="Mumbai — Andheri West")
    city: Mapped[str] = mapped_column(String(80), default="Mumbai")
    platform: Mapped[str] = mapped_column(String(40), default="Zomato")
    vehicle_type: Mapped[str] = mapped_column(String(40), default="Motorcycle")
    upi_id: Mapped[str] = mapped_column(String(120), default="ravi@paytm")

    weekly_earnings: Mapped[int] = mapped_column(Integer, default=4200)
    risk_score: Mapped[int] = mapped_column(Integer, default=50)

    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)

    policies: Mapped[list["Policy"]] = relationship(back_populates="worker")


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), index=True)

    weekly_premium: Mapped[int] = mapped_column(Integer)
    coverage_amount: Mapped[int] = mapped_column(Integer)

    start_date: Mapped[dt.date] = mapped_column(Date, default=lambda: dt.date.today())
    end_date: Mapped[dt.date] = mapped_column(Date)

    status: Mapped[str] = mapped_column(String(20), default="active")
    tier: Mapped[str] = mapped_column(String(20), default="Standard")

    weekly_earnings: Mapped[int] = mapped_column(Integer, default=4200)

    worker: Mapped["Worker"] = relationship(back_populates="policies")


class Trigger(Base):
    __tablename__ = "triggers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trigger_type: Mapped[str] = mapped_column(String(50), index=True)  # Rain, AQI, Flood...
    zone: Mapped[str] = mapped_column(String(120), index=True)
    city: Mapped[str] = mapped_column(String(80), index=True)

    severity: Mapped[str] = mapped_column(String(20), default="high")
    threshold: Mapped[str] = mapped_column(String(80))
    actual_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    data_source: Mapped[str] = mapped_column(String(80))

    status: Mapped[str] = mapped_column(String(20), default="PAYOUT")  # ACTIVE/MONITORING/CLEAR...
    fired_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    cleared_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), index=True)
    trigger_id: Mapped[int] = mapped_column(ForeignKey("triggers.id"), index=True)

    income_lost: Mapped[int] = mapped_column(Integer, default=0)
    fraud_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # approved/rejected/pending

    validated_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)


class Payout(Base):
    __tablename__ = "payouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id"), index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), index=True)

    amount: Mapped[int] = mapped_column(Integer)
    upi_id: Mapped[str] = mapped_column(String(120))
    razorpay_ref: Mapped[str] = mapped_column(String(120), index=True)

    processed_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    time_to_pay_seconds: Mapped[int] = mapped_column(Integer, default=480)

