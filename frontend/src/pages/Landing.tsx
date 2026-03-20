import { useEffect, useMemo, useState } from 'react'

type Stats = {
  activePolicies: number
  totalPayoutsThisWeek: number
  avgPayoutTimeSeconds: number
}

export default function Landing() {
  const [stats, setStats] = useState<Stats>({
    activePolicies: 12847,
    totalPayoutsThisWeek: 420000,
    avgPayoutTimeSeconds: 480,
  })

  // Placeholder counters; frontend will later connect to admin stats endpoint.
  const animated = useMemo(() => ({ ...stats }), [stats])

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const duration = 900
    const from = { ...stats }
    const to = animated

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const ease = 1 - Math.pow(1 - p, 3)
      setStats({
        activePolicies: Math.round(from.activePolicies + (to.activePolicies - from.activePolicies) * ease),
        totalPayoutsThisWeek: Math.round(from.totalPayoutsThisWeek + (to.totalPayoutsThisWeek - from.totalPayoutsThisWeek) * ease),
        avgPayoutTimeSeconds: Math.round(from.avgPayoutTimeSeconds + (to.avgPayoutTimeSeconds - from.avgPayoutTimeSeconds) * ease),
      })
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-100">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#05080f]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 font-bold tracking-tight">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#FF9933] to-[#FFCA28] shadow-[0_0_40px_rgba(255,153,51,0.18)]" />
            <div className="text-lg">GigShield</div>
          </div>
          <nav className="hidden sm:flex gap-6 text-xs uppercase tracking-widest text-white/60">
            <a className="hover:text-white" href="#how">
              How It Works
            </a>
            <a className="hover:text-white" href="#triggers">
              Triggers
            </a>
            <a className="hover:text-white" href="#pricing">
              Pricing
            </a>
          </nav>
          <a
            className="rounded-lg px-4 py-2 text-sm font-semibold bg-[#FF9933] text-black hover:brightness-110 transition"
            href="/onboard"
          >
            Get Covered →
          </a>
        </div>
      </header>

      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            {/* Subtle CSS-only rain vibe */}
            <div
              className="absolute -top-40 left-0 right-0 h-[500px] opacity-20"
              style={{
                background:
                  'radial-gradient(circle at 10% 20%, rgba(0,229,160,0.35), transparent 35%), radial-gradient(circle at 70% 10%, rgba(0,210,255,0.35), transparent 30%), radial-gradient(circle at 40% 60%, rgba(255,153,51,0.18), transparent 35%)',
                filter: 'blur(30px)',
              }}
            />

            {/* Glass/grid overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,153,51,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.10) 1px, transparent 1px)',
                backgroundSize: '48px 48px, 48px 48px',
              }}
            />
          </div>

          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF9933]/30 bg-[#FF9933]/10 px-4 py-2 text-xs uppercase tracking-widest text-[#FFCA28]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00E5A0] shadow-[0_0_12px_rgba(0,229,160,0.65)] animate-pulse" />
              Zero-touch parametric insurance
            </div>
            <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              Protect Every Delivery,
              <br />
              Every <span className="bg-gradient-to-r from-[#00E5A0] via-[#FFCA28] to-[#FF9933] bg-clip-text text-transparent">Rupee</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-white/70">
              India&apos;s first zero-touch parametric income insurance for delivery partners. When external disruption
              stops deliveries, GigShield pays automatically — no claims, no paperwork, under 8 minutes.
            </p>

            <div className="mt-8 flex gap-3 justify-center flex-wrap">
              <a
                href="/onboard"
                className="rounded-xl bg-[#FF9933] text-black px-6 py-3 font-bold shadow-[0_10px_50px_rgba(255,153,51,0.25)] hover:brightness-110 transition"
              >
                Get Covered
              </a>
              <a
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white/90 hover:bg-white/10 transition"
              >
                View Dashboard
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-3xl font-extrabold text-[#FFCA28]">{stats.activePolicies.toLocaleString('en-IN')}</div>
                <div className="text-xs uppercase tracking-widest text-white/60 mt-1">Active Policies</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-3xl font-extrabold text-[#00E5A0]">
                  ₹{stats.totalPayoutsThisWeek.toLocaleString('en-IN')}
                </div>
                <div className="text-xs uppercase tracking-widest text-white/60 mt-1">Total Payouts This Week</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-3xl font-extrabold text-[#FF9933]">
                  {Math.round(stats.avgPayoutTimeSeconds / 60)}min
                </div>
                <div className="text-xs uppercase tracking-widest text-white/60 mt-1">Avg Payout Time</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
                <div className="text-3xl font-extrabold text-white">0</div>
                <div className="text-xs uppercase tracking-widest text-white/60 mt-1">Manual Claims</div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-14">
          <div className="text-[#FF9933] text-xs uppercase tracking-widest font-bold">How it works</div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Start to payout, zero touch</h2>
          <p className="mt-3 text-white/70 max-w-2xl">
            Four steps. Fully automated. When a trigger fires, your money moves before you even know it rained.
          </p>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              ['01', 'Onboard', 'OTP sign-in via mobile. Zone + earnings → AI profile in ~60 seconds.'],
              ['02', 'Trigger Detected', 'Engine polls weather, AQI & civic alerts every ~5 minutes.'],
              ['03', 'AI Validates', 'GPS + zone match + fraud ML validation.'],
              ['04', 'UPI Payout', 'Legit claims approved. UPI payout via Razorpay test mode.'],
            ].map(([num, title, desc]) => (
              <div
                key={num}
                className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition hover:-translate-y-1 hover:border-[#FF9933]/30"
              >
                <div className="text-4xl font-extrabold text-[#FF9933]/20 group-hover:text-[#FF9933]/35">{num}</div>
                <div className="mt-1 font-extrabold text-lg">{title}</div>
                <div className="mt-3 text-sm text-white/70 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="triggers" className="bg-white/0">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <div className="text-[#FF9933] text-xs uppercase tracking-widest font-bold">Parametric triggers</div>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">6 events that auto-pay</h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ['rain', 'Heavy Rainfall', 'IMD Open API', '> 50mm/hr'],
                ['aqi', 'Severe AQI Spike', 'CPCB National API', 'AQI > 300 (Severe+)'],
                ['flood', 'Flood Alert', 'IMD + NDMA', 'Red alert issued'],
                ['curfew', 'Administrative Curfew', 'State Govt / Police', 'Gov advisory active'],
                ['strike', 'City-wide Strike', 'Traffic + News APIs', '> 70% traffic drop'],
                ['heat', 'Extreme Heat Wave', 'IMD Heat Advisory', 'Temp > 42°C'],
              ].map(([key, name, src, threshold]) => {
                const Icon = () => {
                  const common = 'h-8 w-8 text-[#FFCA28]'
                  if (key === 'rain') {
                    return (
                      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 18h10" />
                        <path d="M10 22l-2-4 4 0-2 4z" />
                        <path d="M7 14a5 5 0 0 1 10 0" />
                      </svg>
                    )
                  }
                  if (key === 'aqi') {
                    return (
                      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 20V9a3 3 0 0 1 6 0v11" />
                        <path d="M12 10h6v10" />
                        <path d="M8 16h4" />
                      </svg>
                    )
                  }
                  if (key === 'flood') {
                    return (
                      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
                        <path d="M3 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" />
                      </svg>
                    )
                  }
                  if (key === 'curfew') {
                    return (
                      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M7 7l10 10" />
                      </svg>
                    )
                  }
                  if (key === 'strike') {
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

                return (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:border-[#FF9933]/30 transition group"
                  >
                    <div className="text-3xl flex items-center justify-center">
                      <Icon />
                    </div>
                    <div className="mt-2 font-extrabold">{name}</div>
                    <div className="mt-2 text-xs uppercase tracking-widest text-white/60">{src}</div>
                    <div className="mt-3 inline-flex rounded-lg border border-white/10 px-3 py-1 text-xs text-white/80">
                      {threshold}
                    </div>
                    <div className="mt-4 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full w-0 group-hover:w-[85%] bg-gradient-to-r from-[#00E5A0] to-[#FF9933] transition-all duration-500" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-14">
          <div className="text-[#FF9933] text-xs uppercase tracking-widest font-bold">Weekly pricing</div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Choose a weekly plan</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Starter', price: 49, coverage: 2000, popular: false },
              { name: 'Standard', price: 79, coverage: 4200, popular: true },
              { name: 'Pro', price: 120, coverage: 7000, popular: false },
            ].map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 transition ${
                  t.popular ? 'border-[#FF9933]/40 shadow-[0_0_55px_rgba(255,153,51,0.12)]' : 'hover:border-[#FF9933]/30'
                }`}
              >
                {t.popular && (
                  <div className="inline-flex rounded-full bg-[#FF9933]/15 border border-[#FF9933]/30 px-3 py-1 text-xs font-bold text-[#FFCA28]">
                    Most Popular
                  </div>
                )}
                <div className="mt-4 text-xl font-extrabold">{t.name}</div>
                <div className="mt-3 text-4xl font-extrabold">
                  ₹{t.price}
                  <span className="text-sm font-semibold text-white/60">/week</span>
                </div>
                <div className="mt-2 text-sm text-white/70">Coverage: ₹{t.coverage}</div>
                <a
                  href="/onboard"
                  className={`mt-6 block text-center rounded-xl px-5 py-3 font-bold transition ${
                    t.popular
                      ? 'bg-[#FF9933] text-black hover:brightness-110'
                      : 'bg-white/5 text-white/90 border border-white/15 hover:bg-white/10'
                  }`}
                >
                  Get {t.name}
                </a>
              </div>
            ))}
          </div>
        </section>

        <footer className="py-14 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 text-center text-white/60">
            <div className="font-extrabold text-white">GigShield</div>
            <div className="mt-2 text-sm">
              AI-powered parametric income insurance for India’s gig delivery partners.
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

