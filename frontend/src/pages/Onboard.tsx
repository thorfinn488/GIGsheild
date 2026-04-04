import { useMemo, useState } from 'react'
import { apiPost } from '../lib/api/client'
import { setStoredAuthToken } from '../lib/auth/storage'
import type { RiskProfile } from '../types/api'

export default function Onboard() {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [name, setName] = useState('Ravi Kumar')
  const [mobile, setMobile] = useState('+91 98765 43210')
  const [sentOtp, setSentOtp] = useState<string | null>(null)
  const [otpDigits, setOtpDigits] = useState(['', '', '', ''])
  const otpValue = useMemo(() => otpDigits.join(''), [otpDigits])
  const [token, setToken] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Step 2
  const [cityZone, setCityZone] = useState('Mumbai — Andheri West')
  const [platform, setPlatform] = useState('Zomato')
  const [earnings, setEarnings] = useState(4200)
  const [vehicleType, setVehicleType] = useState('Motorcycle')
  const [upiId, setUpiId] = useState('ravi@paytm')

  // Step 3
  const [calculating, setCalculating] = useState(false)
  const [risk, setRisk] = useState<RiskProfile | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [policyCreated, setPolicyCreated] = useState(false)

  const progress = (
    <div className="flex gap-2">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`h-2 w-8 rounded-full transition ${
            n < step ? 'bg-emerald-400/70' : n === step ? 'bg-[#FF9933]' : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  )

  async function sendOtp() {
    setErr(null)
    setSending(true)
    try {
      const payload = { mobile: mobile.replace(/\s+/g, '') }
      const data = await apiPost<{ otp?: string; expiresIn: number }>('/api/auth/send-otp', payload)
      setSentOtp(data.otp ?? null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSending(false)
    }
  }

  async function verifyOtp() {
    setErr(null)
    if (otpValue.length !== 4) {
      setErr('Enter the 4-digit OTP')
      return
    }
    setVerifying(true)
    try {
      const payload = { mobile: mobile.replace(/\s+/g, ''), otp: otpValue }
      const data = await apiPost<{ access_token: string; token_type: string }>('/api/auth/verify-otp', payload)
      setToken(data.access_token)
      setStoredAuthToken(data.access_token)
      setStep(2)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'OTP verification failed')
    } finally {
      setVerifying(false)
    }
  }

  async function calculateRisk() {
    if (!token) return
    setErr(null)
    setCalculating(true)
    setPolicyCreated(false)
    setRisk(null)
    try {
      const body = {
        name,
        mobile,
        cityZone,
        platform,
        vehicleType,
        upiId,
        weeklyEarnings: earnings,
      }
      const data = await apiPost<RiskProfile & { policyId: number }>('/api/policies/create', body, token)
      setRisk(data)
      setPolicyCreated(true)
      setStep(3)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to calculate risk')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="flex items-center justify-between gap-3">
          <div className="font-extrabold text-2xl">GigShield</div>
          <a className="text-sm text-white/70 hover:text-white" href="/">
            Back
          </a>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[#FFCA28] text-xs uppercase tracking-widest font-bold">New Policy Setup</div>
              <h1 className="mt-2 text-2xl font-extrabold">
                {step === 1 ? 'OTP sign-in' : step === 2 ? 'Work details' : 'AI risk profile'}
              </h1>
            </div>
            {progress}
          </div>

          {step === 1 && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/60">Mobile number</label>
                <input
                  className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#FF9933]"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  inputMode="tel"
                />
              </div>

              <button
                className="w-full rounded-xl bg-[#FF9933] text-black font-bold px-5 py-3 hover:brightness-110 transition disabled:opacity-60"
                onClick={sendOtp}
                disabled={sending}
              >
                {sending ? 'Sending OTP...' : 'Send OTP'}
              </button>

              {sentOtp && (
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                  Demo OTP (mock Twilio): <span className="font-extrabold">{sentOtp}</span>
                </div>
              )}

              <div className="mt-2">
                <div className="text-xs uppercase tracking-widest text-white/60">Enter OTP</div>
                <div className="mt-3 flex gap-2">
                  {otpDigits.map((d, idx) => (
                    <input
                      key={idx}
                      className="h-12 w-12 text-center rounded-xl bg-white/5 border border-white/10 text-lg font-extrabold focus:outline-none focus:border-[#FF9933]"
                      value={d}
                      maxLength={1}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 1)
                        setOtpDigits((prev) => {
                          const next = [...prev]
                          next[idx] = val
                          return next
                        })
                      }}
                      inputMode="numeric"
                    />
                  ))}
                </div>
              </div>

              <button
                className="w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 font-bold hover:bg-white/10 transition disabled:opacity-60"
                onClick={verifyOtp}
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Verify OTP →'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Full name</label>
                  <input
                    className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#FF9933]"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Zone / City</label>
                  <select
                    className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#FF9933]"
                    value={cityZone}
                    onChange={(e) => setCityZone(e.target.value)}
                  >
                    <option>Mumbai — Andheri West</option>
                    <option>Delhi — Connaught Place</option>
                    <option>Bengaluru — Koramangala</option>
                    <option>Chennai — T. Nagar</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-white/60">Delivery Platform</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {['Zomato', 'Swiggy', 'Amazon', 'Blinkit', 'Zepto', 'Flipkart'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`rounded-full px-4 py-2 text-sm border transition ${
                        platform === p ? 'border-[#FF9933] bg-[#FF9933]/15 text-[#FFCA28]' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                      onClick={() => setPlatform(p)}
                    >
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-white/10 bg-white/5 mr-2">
                        {p === 'Zomato' ? 'Z' : p === 'Swiggy' ? 'S' : p === 'Amazon' ? 'A' : p === 'Blinkit' ? 'B' : p === 'Zepto' ? 'Z' : 'F'}
                      </span>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs uppercase tracking-widest text-white/60">Weekly earnings</div>
                  <div className="font-extrabold text-[#FFCA28]">₹{earnings.toLocaleString('en-IN')}</div>
                </div>
                <input
                  className="mt-3 w-full"
                  type="range"
                  min={1500}
                  max={8000}
                  step={50}
                  value={earnings}
                  onChange={(e) => setEarnings(parseInt(e.target.value, 10))}
                />
                <div className="flex justify-between text-xs text-white/50 mt-1">
                  <span>₹1,500</span>
                  <span>₹8,000</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">Vehicle type</label>
                  <select
                    className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#FF9933]"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    {['Bicycle', 'Motorcycle', 'EV Scooter'].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-white/60">UPI ID</label>
                  <input
                    className="mt-2 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 focus:outline-none focus:border-[#FF9933]"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-[#FF9933] text-black font-extrabold px-5 py-3 hover:brightness-110 transition disabled:opacity-60"
                onClick={calculateRisk}
                disabled={!token || calculating}
              >
                {calculating ? 'Calculating AI Risk...' : 'Calculate AI Risk Profile →'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-white/60">AI Risk Profile</div>
                    <div className="mt-2 text-xl font-extrabold">
                      {risk ? `${risk.zoneLabel} · ${risk.platform}` : '—'}
                    </div>
                  </div>
                  <div className="rounded-full border border-[#FF9933]/30 bg-[#FF9933]/10 h-20 w-20 flex items-center justify-center">
                    <div className="text-2xl font-extrabold text-[#FFCA28]">{risk ? risk.zoneRiskScore : 0}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest text-white/60">Zone risk score</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00E5A0] via-[#FFCA28] to-[#FF9933] transition-all duration-700"
                      style={{ width: `${risk ? risk.zoneRiskScore : 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {risk && (
                    <>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-white/60 text-xs uppercase tracking-widest">Flood days/year</div>
                        <div className="font-extrabold mt-1">{risk.breakdown.floodDaysPerYear}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-white/60 text-xs uppercase tracking-widest">AQI spikes/year</div>
                        <div className="font-extrabold mt-1">{risk.breakdown.aqiSpikeDaysPerYear}</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-white/60 text-xs uppercase tracking-widest">Strike frequency</div>
                        <div className="font-extrabold mt-1">{risk.breakdown.strikeFrequency}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#FF9933]/25 bg-[#FF9933]/10 p-5">
                <div className="text-xs uppercase tracking-widest text-white/70 font-bold">Weekly Premium</div>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-4xl font-extrabold text-[#FFCA28]">₹{risk ? risk.weeklyPremium : 0}</div>
                    <div className="text-white/70 mt-1 text-sm">Premium auto-calculated for your zone</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-widest text-white/70 font-bold">Weekly coverage</div>
                    <div className="text-xl font-extrabold text-white/90">₹{risk ? risk.weeklyCoverage : 0}</div>
                  </div>
                </div>
              </div>

              <button
                className="w-full rounded-xl bg-[#FF9933] text-black font-extrabold px-5 py-3 hover:brightness-110 transition disabled:opacity-60"
                onClick={() => {
                  // In this prototype, the policy is created in Step 3 calculation.
                  // Dashboard route will now be accessible with JWT.
                  if (token) window.location.href = '/dashboard'
                }}
                disabled={!policyCreated}
              >
                {policyCreated ? 'Activate Policy →' : 'Calculating...'}
              </button>
            </div>
          )}

          {err && <div className="mt-4 text-sm text-rose-200">{err}</div>}
        </div>
      </div>
    </div>
  )
}

