import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('gigshield_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeader() })
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

type AdminStats = {
  activePolicies: number
  lossRatioPct: number
  fraudBlockedRupees: number
  weeklyPremiumPoolRupees: number
}

type FraudPattern = {
  pattern: string
  count: number
}

type PredictionDay = { day: string; riskPct: number; level: 'Low' | 'Moderate' | 'High' }

export default function Admin() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [fraud, setFraud] = useState<FraudPattern[]>([])
  const [pred, setPred] = useState<PredictionDay[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setErr(null)
      try {
        const [s, f, p] = await Promise.all([
          apiGet<AdminStats>('/api/admin/stats'),
          apiGet<FraudPattern[]>('/api/admin/fraud'),
          apiGet<PredictionDay[]>('/api/admin/predictions'),
        ])
        if (cancelled) return
        setStats(s)
        setFraud(f)
        setPred(p)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Failed to load admin dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chartData = useMemo(() => {
    return pred.map((d: PredictionDay) => ({ day: d.day, riskPct: d.riskPct, level: d.level }))
  }, [pred])

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-[#38BFFF] uppercase tracking-widest font-extrabold">Admin / Insurer Dashboard</div>
            <div className="mt-1 text-2xl font-extrabold">AI Risk + Fraud Monitor</div>
          </div>
          <a className="text-sm text-white/70 hover:text-white" href="/dashboard">
            Worker view
          </a>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Active Policies</div>
                <div className="mt-2 text-3xl font-extrabold text-[#38BFFF]">{stats?.activePolicies?.toLocaleString('en-IN')}</div>
                <div className="text-sm text-white/60 mt-1">↑ 18% vs last week</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Loss Ratio</div>
                <div className="mt-2 text-3xl font-extrabold text-[#FFCA28]">{stats?.lossRatioPct}%</div>
                <div className="text-sm text-white/60 mt-1">Healthy · Target &lt;45%</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Fraud Blocked</div>
                <div className="mt-2 text-3xl font-extrabold text-emerald-200">₹{(stats?.fraudBlockedRupees ?? 0).toLocaleString('en-IN')}</div>
                <div className="text-sm text-white/60 mt-1">Auto-rejected claims</div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Weekly Premium Pool</div>
                <div className="mt-2 text-3xl font-extrabold text-[#FF9933]">₹{(stats?.weeklyPremiumPoolRupees ?? 0).toLocaleString('en-IN')}</div>
                <div className="text-sm text-white/60 mt-1">Avg: ₹69/policy</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Predictive Risk — Next 7 Days</div>
                <div className="mt-3 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" />
                      <YAxis stroke="rgba(255,255,255,0.6)" />
                      <Tooltip />
                      <Bar
                        dataKey="riskPct"
                        radius={[8, 8, 0, 0]}
                      >
                        {chartData.map((entry) => {
                          const fill =
                            entry.level === 'Low'
                              ? 'rgba(0,229,160,0.75)'
                              : entry.level === 'Moderate'
                                ? 'rgba(255,202,40,0.8)'
                                : 'rgba(255,68,68,0.7)'
                          return <Cell key={entry.day} fill={fill} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#00E5A0]" /> Low
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#FFCA28]" /> Moderate
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#FF4444]" /> High
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
                <div className="text-xs uppercase tracking-widest text-white/60">Fraud Detection Panel</div>
                <div className="mt-4 space-y-3">
                  {fraud.map((row) => (
                    <div key={row.pattern} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-sm font-bold">{row.pattern}</div>
                      <div className="text-sm font-extrabold text-[#FFCA28]">{row.count}</div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full rounded-xl border border-[#38BFFF]/25 bg-[#38BFFF]/10 text-[#8fe6ff] px-4 py-2 font-bold hover:bg-[#38BFFF]/15 transition">
                  View Cases
                </button>
              </div>
            </div>
          </>
        )}

        {err && <div className="mt-4 text-sm text-rose-200">{err}</div>}
      </div>
    </div>
  )
}

