import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('gigshield_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type Me = {
  id: number
  name: string
  zone: string
  city: string
  risk_score: number
}

type Policy = {
  id: number
  weeklyCoverage: number
  weeklyPremium: number
  daysRemaining: number
}

type TriggerItem = {
  id: number
  type: string
  status: 'PAYOUT' | 'MONITORING' | 'ACTIVE' | 'CLEAR'
  dataSource: string
  threshold: string
  actualValue: number | null
}

type ClaimItem = {
  id: number
  status: 'APPROVED' | 'REJECTED' | 'PENDING'
  fraudScore: number
  createdAt: string
}

type PayoutItem = {
  id: number
  amount: number
  status: string
  processedAt: string
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeader() })
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<Me | null>(null)
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [triggers, setTriggers] = useState<TriggerItem[]>([])
  const [claims, setClaims] = useState<ClaimItem[]>([])
  const [payouts, setPayouts] = useState<PayoutItem[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [numberAnim, setNumberAnim] = useState({
    payoutsLifetime: 0,
    claimsThisMonth: 0,
    fraudTrustedPct: 0,
    premiumThisWeek: 0,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setErr(null)
      try {
        const [meData, myPolicy, payoutsData, claimsData, triggersData] = await Promise.all([
          apiGet<Me>('/api/auth/me'),
          apiGet<Policy>('/api/policies/my'),
          apiGet<PayoutItem[]>('/api/payouts/history?month=this'),
          apiGet<ClaimItem[]>('/api/claims/my'),
          apiGet<TriggerItem[]>('/api/triggers/live'),
        ])
        if (cancelled) return
        setMe(meData)
        setPolicy(myPolicy)
        setPayouts(payoutsData)
        setClaims(claimsData)
        setTriggers(triggersData)

        // Animated number counters (mocked from returned payloads for now)
        const totalPayoutsLifetime = payoutsData.reduce((acc, p) => acc + (p.amount || 0), 0)
        const claimsThisMonth = claimsData.length
        const fraudTrustedPct = 92
        const premiumThisWeek = myPolicy?.weeklyPremium ?? 0

        const start = performance.now()
        const duration = 900
        const from = { ...numberAnim }
        const to = {
          payoutsLifetime: totalPayoutsLifetime,
          claimsThisMonth,
          fraudTrustedPct,
          premiumThisWeek,
        }

        const tick = (t: number) => {
          const p = Math.min(1, (t - start) / duration)
          const ease = 1 - Math.pow(1 - p, 3)
          setNumberAnim({
            payoutsLifetime: Math.round(from.payoutsLifetime + (to.payoutsLifetime - from.payoutsLifetime) * ease),
            claimsThisMonth: Math.round(from.claimsThisMonth + (to.claimsThisMonth - from.claimsThisMonth) * ease),
            fraudTrustedPct: Math.round(from.fraudTrustedPct + (to.fraudTrustedPct - from.fraudTrustedPct) * ease),
            premiumThisWeek: Math.round(from.premiumThisWeek + (to.premiumThisWeek - from.premiumThisWeek) * ease),
          })
          if (p < 1) requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    const interval = window.setInterval(async () => {
      try {
        const data = await apiGet<TriggerItem[]>('/api/triggers/live')
        setTriggers(data)
      } catch {
        // ignore polling errors
      }
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fraudPie = useMemo(() => {
    const trusted = numberAnim.fraudTrustedPct
    const notTrusted = Math.max(0, 100 - trusted)
    return [
      { name: 'Trusted', value: trusted },
      { name: 'Risk', value: notTrusted },
    ]
  }, [numberAnim.fraudTrustedPct])

  const latestClaim = claims.length > 0 ? claims[0] : null
  const activeTrigger = triggers.find((t: TriggerItem) => t.status !== 'CLEAR') || null
  const heatLevel =
    (me?.risk_score ?? 50) >= 70 ? 'High' : (me?.risk_score ?? 50) >= 50 ? 'Moderate' : 'Low'
  const heatColors =
    heatLevel === 'High'
      ? { current: '#ff4444', mid: '#ffcc02', low: '#00E5A0' }
      : heatLevel === 'Moderate'
        ? { current: '#ffcc02', mid: '#ffcc02', low: '#00E5A0' }
        : { current: '#00E5A0', mid: '#ffcc02', low: '#00E5A0' }

  const TriggerIcon = ({ type }: { type: string }) => {
    const common = 'h-7 w-7 text-[#FFCA28]'
    if (type.includes('Rain')) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 18h10" />
          <path d="M10 22l-2-4 4 0-2 4z" />
          <path d="M7 14a5 5 0 0 1 10 0" />
        </svg>
      )
    }
    if (type.includes('AQI')) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 20V9a3 3 0 0 1 6 0v11" />
          <path d="M12 10h6v10" />
          <path d="M8 16h4" />
        </svg>
      )
    }
    if (type.includes('Flood')) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
          <path d="M3 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
        </svg>
      )
    }
    if (type.includes('Curfew')) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M7 7l10 10" />
        </svg>
      )
    }
    if (type.includes('Strike')) {
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h13" />
          <path d="M4 10h17" />
          <path d="M6 14h15" />
          <path d="M10 18h11" />
        </svg>
      )
    }
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14a4 4 0 0 0-8 0c0 3 2 4 4 4s4-1 4-4Z" />
        <path d="M6 6c2 1 4 1 6 0" />
        <path d="M12 4v6" />
      </svg>
    )
  }

  const ShieldIcon = () => (
    <svg className="h-7 w-7 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4Z" />
      <path d="M9 12l2 2 4-5" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">Worker Dashboard</div>
            <div className="mt-1 text-2xl font-extrabold">{me ? me.name : '—'}</div>
            <div className="text-sm text-white/70">{me ? `${me.zone}, ${me.city}` : ''}</div>
          </div>
          <div className="relative">
            <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
              <svg className="h-6 w-6 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-rose-400" />
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#00E5A0] to-[#38BFFF]/20 flex items-center justify-center text-xl">
                    <ShieldIcon />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/60">Shield Status</div>
                    <div className="mt-1 flex items-center gap-3">
                      <div className="font-extrabold text-lg">ACTIVE</div>
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.6)] animate-pulse" />
                    </div>
                    <div className="text-sm text-white/70 mt-1">
                      Coverage: <span className="font-extrabold text-white/95">₹{policy?.weeklyCoverage?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-sm text-white/70 mt-1">
                      Premium paid this week:{' '}
                      <span className="font-extrabold text-[#FFCA28]">₹{policy?.weeklyPremium?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-[240px]">
                  <div className="text-xs uppercase tracking-widest text-white/60">Days remaining</div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#00E5A0] via-[#FFCA28] to-[#FF9933]"
                      style={{ width: `${Math.min(100, ((policy?.daysRemaining ?? 0) / 7) * 100)}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-white/60 flex justify-between">
                    <span>0</span>
                    <span>{policy?.daysRemaining ?? 0} days</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-xs uppercase tracking-widest text-white/60">Total Payouts Lifetime</div>
                <div className="mt-2 text-2xl font-extrabold text-[#00E5A0]">₹{numberAnim.payoutsLifetime.toLocaleString('en-IN')}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-xs uppercase tracking-widest text-white/60">This Month&apos;s Claims</div>
                <div className="mt-2 text-2xl font-extrabold text-[#FFCA28]">{numberAnim.claimsThisMonth}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-xs uppercase tracking-widest text-white/60">Fraud Score</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-12 w-12 relative">
                    <PieChart width={120} height={120}>
                      <Pie data={fraudPie} dataKey="value" startAngle={180} endAngle={0} innerRadius={38} outerRadius={50} stroke="none">
                        {fraudPie.map((entry, idx) => (
                          <Cell key={entry.name} fill={idx === 0 ? '#00E5A0' : 'rgba(255,255,255,0.18)'} />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-[#00E5A0]">
                      {numberAnim.fraudTrustedPct}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-white/60 mt-2">Trusted</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-xs uppercase tracking-widest text-white/60">Weekly Premium</div>
                <div className="mt-2 text-2xl font-extrabold text-[#FF9933]">₹{numberAnim.premiumThisWeek.toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 lg:col-span-2">
                <div className="text-xs uppercase tracking-widest text-white/60">Live Disruption Feed</div>
                <div className="mt-3 space-y-3">
                  {triggers.length === 0 ? (
                    <div className="text-sm text-white/60">No active triggers right now.</div>
                  ) : (
                    triggers.map((t: TriggerItem) => {
                      const badge =
                        t.status === 'PAYOUT'
                          ? 'border-[#38BFFF]/30 bg-[#38BFFF]/10 text-[#8fe6ff]'
                          : t.status === 'ACTIVE'
                            ? 'border-rose-400/30 bg-rose-400/10 text-rose-200'
                            : t.status === 'MONITORING'
                              ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                              : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                      const label =
                        t.status === 'PAYOUT'
                          ? 'Payout Processed'
                          : t.status === 'ACTIVE'
                            ? 'Active'
                            : t.status === 'MONITORING'
                              ? 'Monitoring'
                              : 'All Clear'
                      return (
                        <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3 animate-[slideIn_220ms_ease-out]">
                          <div className="pt-1">
                            <TriggerIcon type={t.type} />
                          </div>
                          <div className="flex-1">
                            <div className="font-extrabold">{t.type}</div>
                            <div className="text-xs text-white/60 mt-1">
                              {t.dataSource} · threshold {t.threshold}
                            </div>
                            {t.actualValue !== null && (
                              <div className="text-sm text-white/70 mt-2">
                                Actual: <span className="font-extrabold">{t.actualValue}</span>
                              </div>
                            )}
                          </div>
                          <div className={`text-xs font-bold px-3 py-1 rounded-full border ${badge}`}>{label}</div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Auto-Claim Timeline</div>
                <div className="mt-4 space-y-3">
                  {activeTrigger ? (
                    ['Trigger Detected', 'GPS Validated', 'Fraud Check', 'Payout Sent'].map((step, idx) => (
                      <div key={step} className="flex items-start gap-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-extrabold ${idx < 3 ? 'bg-emerald-400/15 border border-emerald-400/30 text-emerald-200' : 'bg-white/5 border border-white/10 text-white/60'}`}>
                          {idx < 3 ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-current/60" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-extrabold">{step}</div>
                          <div className="text-xs text-white/60 mt-1">{idx === 0 ? 'Now' : `~${idx + 1} min`}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-white/60">Waiting for a trigger event in your zone.</div>
                  )}
                  {latestClaim && (
                    <div className="text-xs text-white/60 mt-1">
                      Latest claim: <span className="text-white/80 font-extrabold">{latestClaim.status}</span> · fraud score{' '}
                      <span className="text-[#FFCA28] font-extrabold">{Math.round((latestClaim.fraudScore ?? 0) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="text-xs uppercase tracking-widest text-white/60">Payout History</div>
              <div className="mt-3 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-widest text-white/60">
                    <tr>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.slice(0, 8).map((p: PayoutItem) => (
                      <tr key={p.id} className="border-t border-white/10">
                        <td className="py-2 text-white/70">{new Date(p.processedAt).toLocaleDateString('en-IN')}</td>
                        <td className="py-2 font-extrabold text-emerald-200">+₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-white/70">{p.status}</td>
                      </tr>
                    ))}
                    {payouts.length === 0 && (
                      <tr>
                        <td className="py-4 text-white/60" colSpan={3}>
                          No payouts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="text-xs uppercase tracking-widest text-white/60">Zone Risk Heatmap</div>
              <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-white/70">
                  Current zone: <span className="font-extrabold text-white">{me ? me.zone : ''}</span>
                </div>
                <div className="text-sm font-extrabold" style={{ color: heatColors.current }}>
                  {heatLevel} risk
                </div>
              </div>
              <div className="mt-4">
                <svg viewBox="0 0 320 180" className="w-full h-auto">
                  <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect x="0" y="0" width="320" height="180" rx="18" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" />
                  <g opacity="0.5">
                    <path d="M40 150 C100 80, 170 90, 280 40" fill="none" stroke="rgba(56,191,255,0.15)" strokeWidth="2" />
                    <path d="M30 60 C110 130, 190 130, 300 90" fill="none" stroke="rgba(255,153,51,0.12)" strokeWidth="2" />
                  </g>
                  {/* Low/medium/current circles (mock map) */}
                  <circle cx="80" cy="110" r="26" fill={heatColors.low} opacity="0.22" stroke={heatColors.low} strokeWidth="2" filter="url(#glow)" />
                  <circle cx="165" cy="75" r="22" fill={heatColors.mid} opacity="0.20" stroke={heatColors.mid} strokeWidth="2" />
                  <circle cx="230" cy="120" r="30" fill={heatColors.current} opacity="0.18" stroke={heatColors.current} strokeWidth="2" filter="url(#glow)" />
                  <text x="230" y="126" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="10" fontFamily="system-ui">
                    {me ? me.zone : 'ZONE'}
                  </text>
                </svg>
              </div>
            </div>
          </>
        )}

        {err && <div className="mt-4 text-sm text-rose-200">{err}</div>}
      </div>

      {/* Minimal keyframes used above */}
      <style>{`
        @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </div>
  )
}

