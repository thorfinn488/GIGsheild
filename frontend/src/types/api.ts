/** Shared API / domain types — import from here as the app grows. */

export type Me = {
  id: number
  name: string
  zone: string
  city: string
  risk_score: number
}

export type Policy = {
  id: number
  weeklyCoverage: number
  weeklyPremium: number
  daysRemaining: number
}

export type TriggerItem = {
  id: number
  type: string
  status: 'PAYOUT' | 'MONITORING' | 'ACTIVE' | 'CLEAR'
  dataSource: string
  threshold: string
  actualValue: number | null
}

export type ClaimItem = {
  id: number
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
  fraudScore: number
  createdAt: string
}

export type PayoutItem = {
  id: number
  amount: number
  status: string
  processedAt: string
}

export type RiskBreakdown = {
  floodDaysPerYear: number
  aqiSpikeDaysPerYear: number
  strikeFrequency: number
}

export type RiskProfile = {
  zoneRiskScore: number
  breakdown: RiskBreakdown
  weeklyPremium: number
  weeklyCoverage: number
  zoneLabel: string
  platform: string
}

export type AdminStats = {
  activePolicies: number
  lossRatioPct: number
  fraudBlockedRupees: number
  weeklyPremiumPoolRupees: number
}

export type FraudPattern = {
  pattern: string
  count: number
}

export type PredictionDay = { day: string; riskPct: number; level: 'Low' | 'Moderate' | 'High' }
