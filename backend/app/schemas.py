from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from pydantic import BaseModel, Field


class SendOtpRequest(BaseModel):
    mobile: str


class VerifyOtpRequest(BaseModel):
    mobile: str
    otp: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: Literal["worker", "admin"]


class WorkerProfile(BaseModel):
    id: int
    name: str
    zone: str
    city: str
    platform: str
    upi_id: str
    weekly_earnings: int


class CreatePolicyRequest(BaseModel):
    name: str
    mobile: str
    cityZone: str
    platform: str
    vehicleType: str
    upiId: str
    weeklyEarnings: int = Field(..., ge=1)


class RiskBreakdown(BaseModel):
    floodDaysPerYear: int
    aqiSpikeDaysPerYear: int
    strikeFrequency: int


class PolicyResponse(BaseModel):
    policyId: int
    tier: str
    weeklyPremium: int
    weeklyCoverage: int
    zoneRiskScore: int
    breakdown: RiskBreakdown
    zoneLabel: str
    platform: str
    daysRemaining: int


class PolicySummary(BaseModel):
    id: int
    weeklyCoverage: int
    weeklyPremium: int
    daysRemaining: int


class TriggerLiveItem(BaseModel):
    id: int
    type: str
    status: Literal["PAYOUT", "MONITORING", "ACTIVE", "CLEAR"]
    dataSource: str
    threshold: str
    actualValue: float | None


class TriggerHistoryItem(BaseModel):
    id: int
    type: str
    firedAt: dt.datetime
    actualValue: float | None
    status: str


class ClaimItem(BaseModel):
    id: int
    status: Literal["APPROVED", "REJECTED", "PENDING"]
    fraudScore: float
    createdAt: dt.datetime


class PayoutItem(BaseModel):
    id: int
    amount: int
    status: str
    processedAt: dt.datetime


class AdminStatsResponse(BaseModel):
    activePolicies: int
    lossRatioPct: float
    fraudBlockedRupees: int
    weeklyPremiumPoolRupees: int


class FraudPatternResponse(BaseModel):
    pattern: str
    count: int


class PredictionDayResponse(BaseModel):
    day: str
    riskPct: int
    level: Literal["Low", "Moderate", "High"]

