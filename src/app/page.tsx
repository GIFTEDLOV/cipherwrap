'use client'

import Link from 'next/link'
import { Reveal } from '@/components/Reveal'

// ── data ──────────────────────────────────────────────────────────────────────

const DEMO_STEPS = [
  { n: '01', label: 'Connect wallet', sub: 'MetaMask / injected' },
  { n: '02', label: 'Mint test tokens', sub: 'Public mock faucet' },
  { n: '03', label: 'Approve', sub: 'ERC-20 allowance' },
  { n: '04', label: 'Wrap', sub: 'FHE-encrypt on-chain' },
  { n: '05', label: 'Decrypt balance', sub: 'EIP-712 permit, zero gas' },
  { n: '06', label: 'Unwrap', sub: 'Two-phase finalization' },
]

const INTELLIGENCE_FEATURES = [
  {
    icon: LiveIcon,
    title: 'Live registry reads',
    desc: 'getTokenConfidentialTokenPairs() called on every load. Never cached static data.',
    accent: 'blue',
  },
  {
    icon: ValidIcon,
    title: 'isValid enforced everywhere',
    desc: 'Revoked pairs remain visible but wrap / unwrap is disabled — exactly as the spec requires.',
    accent: 'emerald',
  },
  {
    icon: DupIcon,
    title: 'Duplicate detection',
    desc: 'ctGBP and ctGBPMock share an underlying symbol. Both are flagged in the registry browser.',
    accent: 'amber',
  },
  {
    icon: UnknownIcon,
    title: 'Unknown entry caution',
    desc: 'Addresses not in our verified list are displayed with a caution badge — never hidden, never crashing.',
    accent: 'violet',
  },
]

// ── icons ─────────────────────────────────────────────────────────────────────

function LiveIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 12.728M5.636 5.636a9 9 0 0 1 12.728 12.728M5.636 5.636 12 12m0 0 6.364 6.364" />
    </svg>
  )
}
function ValidIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.745 3.745 0 0 1 3.296-1.043A3.745 3.745 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  )
}
function DupIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  )
}
function UnknownIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  )
}

// accent colour map
const ACCENT: Record<string, { icon: string; card: string; pill: string }> = {
  blue:    { icon: '#60a5fa', card: 'rgba(59,130,246,0.08)',   pill: 'rgba(59,130,246,0.12)'   },
  emerald: { icon: '#34d399', card: 'rgba(52,211,153,0.06)',   pill: 'rgba(52,211,153,0.12)'   },
  amber:   { icon: '#fbbf24', card: 'rgba(251,191,36,0.06)',   pill: 'rgba(251,191,36,0.12)'   },
  violet:  { icon: '#a78bfa', card: 'rgba(167,139,250,0.07)', pill: 'rgba(167,139,250,0.12)'  },
}

// ── nebula blobs (CSS-only, no canvas) ───────────────────────────────────────

function NebulaBg() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      {/* Blue nebula — top left */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: '-15%', left: '-12%',
          width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Violet nebula — top right */}
      <div
        className="absolute animate-nebula-pulse"
        style={{
          top: '-5%', right: '-15%',
          width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 70%)',
          filter: 'blur(90px)',
          animationDelay: '3s',
        }}
      />
      {/* Cyan accent — center horizon */}
      <div
        className="absolute left-1/2 animate-nebula-pulse"
        style={{
          top: '38%',
          transform: 'translateX(-50%)',
          width: 900, height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.07) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animationDelay: '1.5s',
        }}
      />
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* Nebula blobs — landing-only layer above the shared starfield */}
      <NebulaBg />

      <div className="relative" style={{ zIndex: 10 }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-8 text-center">

          {/* Eyebrow badge */}
          <div
            className="mb-8 inline-flex animate-fade-in-up items-center gap-2 rounded-full px-4 py-1.5"
            style={{
              background: 'rgba(59,130,246,0.08)',
              border: '1px solid rgba(59,130,246,0.2)',
              animationDelay: '0ms',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: '#60a5fa', boxShadow: '0 0 6px #60a5fa' }}
            />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest" style={{ color: '#93c5fd' }}>
              Zama Developer Program · Season 3 · Sepolia
            </span>
          </div>

          {/* Title */}
          <h1
            className="animate-fade-in-up font-display font-bold tracking-tight"
            style={{
              fontSize: 'clamp(3.5rem, 10vw, 7rem)',
              lineHeight: 1.05,
              animationDelay: '100ms',
            }}
          >
            <span className="text-gradient-electric">Cipher</span>
            <span className="text-white">Wrap</span>
          </h1>

          {/* Tagline */}
          <p
            className="mx-auto mb-10 mt-5 max-w-xl animate-fade-in-up text-lg leading-relaxed"
            style={{ color: '#94a3b8', animationDelay: '240ms' }}
          >
            The Zama Confidential Token Wrappers Registry — explored, classified, and made usable.
            Wrap ERC-20s into{' '}
            <span style={{ color: '#93c5fd' }}>FHE ciphertexts</span>.
            Decrypt only with{' '}
            <span style={{ color: '#c4b5fd' }}>your EIP-712 permit</span>.
          </p>

          {/* CTAs */}
          <div
            className="mb-8 flex animate-fade-in-up flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: '380ms' }}
          >
            <Link
              href="/demo"
              className="btn-gold inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base"
            >
              Start Guided Demo
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/registry"
              className="btn-ghost-blue inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold"
              style={{ color: '#cbd5e1' }}
            >
              Explore Registry
            </Link>
          </div>

          {/* Trust signals */}
          <div
            className="mb-12 flex animate-fade-in-up flex-wrap items-center justify-center gap-x-6 gap-y-2"
            style={{ animationDelay: '520ms' }}
          >
            {[
              'Live registry reads',
              'Real EIP-712 decrypt',
              'Two-phase unwrap',
              '41 unit tests passing',
            ].map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                <span style={{ color: '#34d399' }}>✓</span>
                {s}
              </span>
            ))}
          </div>

          {/* Scroll hint */}
          <div
            className="flex animate-fade-in-up flex-col items-center gap-1.5"
            style={{ animationDelay: '680ms' }}
          >
            <span className="text-xs" style={{ color: '#334155' }}>Scroll to explore</span>
            <span className="animate-bounce text-sm" style={{ color: '#334155' }}>↓</span>
          </div>
        </section>

        {/* Fade transition from hero → content */}
        <div
          className="pointer-events-none h-24"
          style={{
            background: 'linear-gradient(to bottom, transparent, #010209)',
            marginTop: '-6rem',
          }}
        />

        {/* ── Content sections (solid bg covers starfield) ──────────────────── */}
        <div style={{ background: '#010209' }}>

          {/* ── Section: The privacy problem ───────────────────────────────── */}
          <section className="mx-auto max-w-4xl px-4 py-24">
            <Reveal>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
                The problem
              </div>
              <h2 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">
                On-chain balances are{' '}
                <span style={{ color: '#f87171' }}>public by default</span>
              </h2>
              <p className="mb-12 max-w-2xl text-base leading-relaxed" style={{ color: '#64748b' }}>
                Every ERC-20 balance is a plain integer, readable by any node, block explorer,
                or smart contract. Zama&apos;s Fully Homomorphic Encryption solves this at the
                protocol level with ERC-7984 confidential wrappers.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Before */}
                <div
                  className="glass rounded-xl p-6"
                  style={{ borderColor: 'rgba(239,68,68,0.14)', background: 'rgba(20,5,5,0.6)' }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                    >
                      BEFORE — ERC-20
                    </span>
                  </div>
                  <pre className="mb-3 overflow-x-auto rounded-lg p-3 font-mono text-sm leading-relaxed"
                    style={{ background: 'rgba(0,0,0,0.4)', color: '#fca5a5' }}>
{`balanceOf(0xYou)
→ 1000000000    // visible
                 // to everyone`}
                  </pre>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                    Any wallet, DEX aggregator, MEV bot, or block explorer can see your exact
                    balance at any block height, forever.
                  </p>
                </div>

                {/* After */}
                <div
                  className="glass rounded-xl p-6"
                  style={{ borderColor: 'rgba(59,130,246,0.18)', background: 'rgba(4,9,21,0.7)' }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className="rounded-md px-2 py-0.5 text-xs font-bold"
                      style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}
                    >
                      AFTER — ERC-7984
                    </span>
                  </div>
                  <pre className="mb-3 overflow-x-auto rounded-lg p-3 font-mono text-sm leading-relaxed"
                    style={{ background: 'rgba(0,0,0,0.4)', color: '#93c5fd' }}>
{`confidentialBalanceOf(0xYou)
→ 0x3f8a9c…d2e1  // ciphertext
                   // only you can
                   // decrypt`}
                  </pre>
                  <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
                    An FHE ciphertext handle. Unreadable to anyone — including the contract
                    owner — without an explicit EIP-712 user-issued permit.
                  </p>
                </div>
              </div>
            </Reveal>
          </section>

          <div className="section-glow mx-auto max-w-4xl" />

          {/* ── Section: How it works ──────────────────────────────────────── */}
          <section className="mx-auto max-w-4xl px-4 py-24">
            <Reveal>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#a78bfa' }}>
                The mechanism
              </div>
              <h2 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">
                How ERC-7984 + FHE works
              </h2>
              <p className="mb-12 max-w-2xl text-base leading-relaxed" style={{ color: '#64748b' }}>
                Three steps. The hard cryptography runs in Zama&apos;s FHE network, not your wallet.
              </p>
            </Reveal>

            <div className="relative flex flex-col gap-0">
              {[
                {
                  n: '1',
                  label: 'You hold a plaintext ERC-20',
                  body: 'Your ERC-20 balance is a public uint256 on-chain. Any observer can read it.',
                  highlight: false,
                  delay: 100,
                },
                {
                  n: '2',
                  label: 'Wrap → FHE ciphertext',
                  body: 'CipherWrap calls wrap() on the ERC-7984 contract. Your tokens are deposited and your balance becomes an encrypted ciphertext handle — unreadable to anyone without your explicit permit.',
                  highlight: true,
                  delay: 200,
                },
                {
                  n: '3',
                  label: 'Decrypt only for you',
                  body: 'You sign a free EIP-712 permit off-chain. The Zama FHE network produces a user-specific decryption. Only the permit holder can read the result.',
                  highlight: false,
                  delay: 300,
                },
              ].map((step, i, arr) => (
                <Reveal key={step.n} delay={step.delay}>
                  <div className="flex gap-5">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold"
                        style={step.highlight
                          ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }
                          : { background: 'rgba(30,30,60,0.8)', border: '1px solid rgba(59,130,246,0.2)', color: '#64748b' }
                        }
                      >
                        {step.n}
                      </div>
                      {i < arr.length - 1 && (
                        <div className="my-2 w-px flex-1" style={{ background: 'rgba(59,130,246,0.15)' }} />
                      )}
                    </div>
                    <div className="pb-10">
                      <p
                        className="mb-2 font-display text-base font-semibold"
                        style={{ color: step.highlight ? '#93c5fd' : '#e2e8f0' }}
                      >
                        {step.label}
                      </p>
                      <p className="max-w-xl text-sm leading-relaxed" style={{ color: '#64748b' }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <div className="section-glow mx-auto max-w-4xl" />

          {/* ── Section: Registry Intelligence ─────────────────────────────── */}
          <section className="mx-auto max-w-4xl px-4 py-24">
            <Reveal>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#34d399' }}>
                Registry Intelligence
              </div>
              <h2 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">
                Live. Classified. Defended.
              </h2>
              <p className="mb-12 max-w-2xl text-base leading-relaxed" style={{ color: '#64748b' }}>
                CipherWrap reads the registry contract on every page load and runs a classification
                pass over all returned pairs — including revoked, unknown, and duplicate entries.
              </p>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {INTELLIGENCE_FEATURES.map((f, i) => {
                const a = ACCENT[f.accent]
                const Icon = f.icon
                return (
                  <Reveal key={f.title} delay={i * 80}>
                    <div
                      className="glass glass-hover h-full rounded-xl p-6 transition-all"
                      style={{ background: a.card, borderColor: `rgba(255,255,255,0.06)` }}
                    >
                      <div
                        className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg"
                        style={{ background: a.pill, color: a.icon }}
                      >
                        <Icon />
                      </div>
                      <h3 className="mb-2 font-display font-semibold text-white">{f.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{f.desc}</p>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          </section>

          <div className="section-glow mx-auto max-w-4xl" />

          {/* ── Section: Guided Demo ────────────────────────────────────────── */}
          <section className="mx-auto max-w-4xl px-4 py-24">
            <Reveal>
              <div
                className="relative overflow-hidden rounded-2xl p-8 md:p-10"
                style={{
                  background: 'linear-gradient(135deg, rgba(8,15,40,0.9), rgba(14,24,64,0.9))',
                  border: '1px solid rgba(251,191,36,0.18)',
                  boxShadow: '0 0 60px rgba(251,191,36,0.06)',
                }}
              >
                {/* Corner glow */}
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
                />

                <div className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
                  Guided Demo
                </div>
                <h2 className="mb-3 font-display text-3xl font-bold text-white md:text-4xl">
                  Six steps from zero to decrypted
                </h2>
                <p className="mb-8 max-w-lg text-sm leading-relaxed" style={{ color: '#64748b' }}>
                  A judge-friendly walkthrough with progress tracking, calm error handling,
                  and honest tx states at each step.
                </p>

                {/* Step grid */}
                <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {DEMO_STEPS.map((s) => (
                    <div
                      key={s.n}
                      className="flex items-start gap-3 rounded-xl p-3"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <span
                        className="mt-0.5 shrink-0 font-mono text-xs font-bold"
                        style={{ color: '#fbbf24' }}
                      >
                        {s.n}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-white">{s.label}</p>
                        <p className="mt-0.5 text-[11px]" style={{ color: '#475569' }}>{s.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/demo"
                  className="btn-gold inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm"
                >
                  Start Guided Demo
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </Reveal>
          </section>

          <div className="section-glow mx-auto max-w-4xl" />

          {/* ── Section: Developer Kit ──────────────────────────────────────── */}
          <section className="mx-auto max-w-4xl px-4 py-24">
            <Reveal>
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#a78bfa' }}>
                Developer Kit
              </div>
              <h2 className="mb-4 font-display text-4xl font-bold text-white md:text-5xl">
                Copy-paste ready snippets
              </h2>
              <p className="mb-8 max-w-2xl text-base leading-relaxed" style={{ color: '#64748b' }}>
                Real addresses. Real ABIs. Real hook signatures from{' '}
                <code
                  className="rounded px-1 py-0.5 font-mono text-sm"
                  style={{ background: 'rgba(59,130,246,0.1)', color: '#93c5fd' }}
                >
                  @zama-fhe/react-sdk
                </code>
                . Generated for every pair in the registry.
              </p>
            </Reveal>

            <Reveal delay={100}>
              <div
                className="glass rounded-xl overflow-hidden"
                style={{ borderColor: 'rgba(139,92,246,0.15)' }}
              >
                <div
                  className="flex items-center justify-between border-b px-4 py-2.5"
                  style={{ borderBottomColor: 'rgba(139,92,246,0.12)', background: 'rgba(0,0,0,0.3)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#ef4444' }} />
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#fbbf24' }} />
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#22c55e' }} />
                  </div>
                  <span className="font-mono text-xs" style={{ color: '#475569' }}>TypeScript · @zama-fhe/react-sdk</span>
                </div>
                <pre
                  className="overflow-x-auto p-5 font-mono text-xs leading-relaxed"
                  style={{ color: '#94a3b8' }}
                >
                  <code>
{`// Approve + Wrap (shield)
const { mutate: approve } = useApproveUnderlying(
  '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639'
)
const { mutate: shield } = useShield({
  address: '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639'
})

// Decrypt confidential balance (EIP-712, zero gas)
const { data: balance } = useConfidentialBalance(
  { address: WRAPPER, account: userAddress },
  { enabled: hasPermit === true }   // bigint — only for you
)

// Unwrap — real two-phase flow
const { mutate: unshield } = useUnshield(WRAPPER)
unshield({
  amount,
  onUnwrapSubmitted:   (tx) => console.log('Phase 1:', tx),
  onFinalizeSubmitted: (tx) => console.log('Phase 2:', tx),
})`}
                  </code>
                </pre>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/developers"
                  className="btn-ghost-blue inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
                  style={{ color: '#c4b5fd' }}
                >
                  Full Developer Kit →
                </Link>
                <Link
                  href="/registry"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium transition-colors"
                  style={{ color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#94a3b8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#475569' }}
                >
                  Browse Registry
                </Link>
              </div>
            </Reveal>
          </section>

          {/* ── Final CTA ────────────────────────────────────────────────────── */}
          <section className="mx-auto max-w-4xl px-4 pb-32 pt-8 text-center">
            <Reveal>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>
                Ready?
              </p>
              <h2 className="mb-6 font-display text-3xl font-bold text-white md:text-4xl">
                Wrap your first confidential token
              </h2>
              <Link
                href="/demo"
                className="btn-gold inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base"
              >
                Open Guided Demo →
              </Link>
              <p className="mt-5 text-xs" style={{ color: '#1e293b' }}>
                No mainnet. Sepolia testnet only. Connect MetaMask to begin.
              </p>
            </Reveal>
          </section>

        </div>{/* /content sections */}
      </div>{/* /relative z-10 */}
    </>
  )
}
