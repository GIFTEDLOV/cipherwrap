import Link from 'next/link'
import { Reveal } from '@/components/Reveal'

// ── icons ─────────────────────────────────────────────────────────────────────

function InvoiceIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  )
}

function PayrollIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  )
}

function DistributionIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

// ── use-case data ─────────────────────────────────────────────────────────────

const USE_CASES = [
  {
    id: '01',
    title: 'Private Invoices',
    icon: InvoiceIcon,
    accent: { text: '#34d399', bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.14)', iconBg: 'rgba(52,211,153,0.10)' },
    problem:
      'Every vendor payment you make on-chain is permanently public. Your counterparty\'s address, the exact invoice amount, payment date, and frequency are visible to any block explorer, competitor, or MEV bot — forever.',
    publicCode: `// ERC-20: anyone on Etherscan can see
balanceOf(0xYou)  → 1,000,000 USDC
transfer(0xVendor, 50_000e6)
// amount, date, vendor, frequency:
// all permanently public`,
    confidentialCode: `// ERC-7984: amount is FHE-encrypted
confidentialBalanceOf(0xYou)
→ 0x3f8a9c…d2e1   // ciphertext

// Only 0xVendor's EIP-712 permit
// can decrypt what they received`,
    steps: [
      'Find cUSDCMock in the registry — the Sepolia confidential USDC wrapper.',
      'Mint test USDC via the public mock faucet (1 click, no gas).',
      'Approve + wrap: your USDC balance becomes an FHE ciphertext handle.',
      'Decrypt your balance using an EIP-712 permit — only your wallet can read it.',
    ],
    nextStep:
      'When confidential transfers are live, the wrapped balance moves directly to the vendor\'s address — amount stays encrypted end-to-end. Today, CipherWrap proves the wrap → encrypt → decrypt cycle that every private invoice flow builds on.',
    cta: { label: 'Try with cUSDCMock', href: '/token/0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639' },
    ctaSecondary: { label: 'Open Guided Demo', href: '/demo' },
  },
  {
    id: '02',
    title: 'Confidential Payroll',
    icon: PayrollIcon,
    accent: { text: '#60a5fa', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.14)', iconBg: 'rgba(59,130,246,0.10)' },
    problem:
      'On-chain salary payments expose every employee\'s exact compensation to coworkers, recruiters, and the public — permanently. Each payroll run creates a public record mapping wallet address to salary amount.',
    publicCode: `// ERC-20: salary visible to everyone
transfer(0xEmployee, 8_333e6)
// → $8,333 USDT, monthly

// Any coworker or recruiter
// can see every salary tier`,
    confidentialCode: `// ERC-7984: salary is FHE-encrypted
confidentialBalanceOf(0xEmployee)
→ 0x7c12ab…f3e8   // ciphertext

// Only 0xEmployee's permit
// reveals their own payslip`,
    steps: [
      'Find cUSDTMock in the registry — confidential USDT on Sepolia.',
      'Mint test USDT from the public mock faucet.',
      'Approve + wrap: your salary tokens become an encrypted ciphertext.',
      'Decrypt your own balance with EIP-712 — no one else can read it.',
    ],
    nextStep:
      'The full payroll flow requires confidential transfers from the employer\'s wrapped balance to each employee. Today, CipherWrap lets you test the employee-side: wrap a salary payment and decrypt your own confidential balance — the receiving half of the private payroll cycle.',
    cta: { label: 'Try with cUSDTMock', href: '/token/0x4E7B06D78965594eB5EF5414c357ca21E1554491' },
    ctaSecondary: { label: 'Open Guided Demo', href: '/demo' },
  },
  {
    id: '03',
    title: 'Investor & Contributor Distributions',
    icon: DistributionIcon,
    accent: { text: '#a78bfa', bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.14)', iconBg: 'rgba(139,92,246,0.10)' },
    problem:
      'Token distributions to investors, advisors, or contributors expose your entire cap table on-chain. Anyone can reconstruct ownership percentages, vesting schedules, and allocation details from public transfer records — leaking commercial and legal intelligence.',
    publicCode: `// ERC-20: cap table is public
transfer(0xInvestorA, 2_500_000e6)
transfer(0xAdvisor,     250_000e6)
transfer(0xFounder,  10_000_000e6)

// Any observer can calculate
// ownership percentages instantly`,
    confidentialCode: `// ERC-7984: allocations stay private
confidentialBalanceOf(0xInvestorA)
→ 0x9d3f12…a7c1   // ciphertext

// Only 0xInvestorA can decrypt
// their own allocation amount`,
    steps: [
      'Find ctGBPMock in the registry — a GBP-denominated confidential wrapper.',
      'Mint test tGBP from the public mock faucet.',
      'Wrap your allocation: tokens become FHE-encrypted — cap table stays private.',
      'Decrypt your own allocation using EIP-712 — investors see only their own share.',
    ],
    nextStep:
      'Private distributions require confidential transfers from the issuer to each investor address. Today, CipherWrap covers the investor-side: wrap received tokens and decrypt your own allocation privately. Pair with the Developer Kit to integrate the issuance side.',
    cta: { label: 'Try with ctGBPMock', href: '/token/0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC' },
    ctaSecondary: { label: 'Developer Kit', href: '/developers' },
  },
]

// ── page ──────────────────────────────────────────────────────────────────────

export default function UseCasesPage() {
  return (
    <div style={{ background: '#010209' }}>
      <div className="mx-auto max-w-4xl px-4 pb-32 pt-16">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <Reveal>
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#60a5fa' }}>
            Real-world workflows
          </div>
          <h1 className="mb-5 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
            Real-world workflows<br className="hidden sm:block" />{' '}
            <span className="text-gradient-electric">powered by CipherWrap</span>
          </h1>
          <p className="mb-3 max-w-2xl text-base leading-relaxed" style={{ color: '#64748b' }}>
            CipherWrap is the gateway for turning public ERC-20 assets into confidential ERC-7984
            assets — the foundation for private invoices, payroll, vendor payments, and investor
            distributions where on-chain balance transparency creates real commercial risk.
          </p>
          <p className="mb-12 max-w-2xl text-sm leading-relaxed" style={{ color: '#475569' }}>
            Each use case below explains the problem, the privacy leak, and how ERC-7984 solves it —
            with a direct link into the existing wrap, decrypt, and unwrap flow.
          </p>
        </Reveal>

        {/* ── Use case cards ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-10">
          {USE_CASES.map((uc, idx) => {
            const Icon = uc.icon
            return (
              <Reveal key={uc.id} delay={idx * 80}>
                <article
                  className="glass rounded-2xl overflow-hidden"
                  style={{ borderColor: uc.accent.border, background: uc.accent.bg }}
                >
                  {/* Card header */}
                  <div
                    className="flex items-start gap-4 border-b px-7 py-6"
                    style={{ borderBottomColor: uc.accent.border, background: 'rgba(0,0,0,0.15)' }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: uc.accent.iconBg, color: uc.accent.text }}
                    >
                      <Icon />
                    </div>
                    <div className="flex-1">
                      <div
                        className="mb-0.5 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: uc.accent.text }}
                      >
                        Use Case {uc.id}
                      </div>
                      <h2 className="font-display text-xl font-bold text-white">{uc.title}</h2>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-7 py-6">

                    {/* Problem */}
                    <p className="mb-6 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                      {uc.problem}
                    </p>

                    {/* Before / After */}
                    <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div
                        className="rounded-xl p-4"
                        style={{ background: 'rgba(20,5,5,0.55)', border: '1px solid rgba(239,68,68,0.12)' }}
                      >
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <span
                            className="rounded px-1.5 py-0.5 text-xs font-bold"
                            style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                          >
                            ERC-20 · public
                          </span>
                        </div>
                        <pre
                          className="overflow-x-auto font-mono text-xs leading-relaxed"
                          style={{ color: '#fca5a5' }}
                        >
                          {uc.publicCode}
                        </pre>
                      </div>

                      <div
                        className="rounded-xl p-4"
                        style={{ background: 'rgba(4,9,21,0.65)', border: `1px solid ${uc.accent.border}` }}
                      >
                        <div className="mb-2.5 flex items-center gap-1.5">
                          <span
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold"
                            style={{ background: `${uc.accent.iconBg}`, color: uc.accent.text }}
                          >
                            <LockIcon />
                            ERC-7984 · confidential
                          </span>
                        </div>
                        <pre
                          className="overflow-x-auto font-mono text-xs leading-relaxed"
                          style={{ color: uc.accent.text }}
                        >
                          {uc.confidentialCode}
                        </pre>
                      </div>
                    </div>

                    {/* How CipherWrap helps */}
                    <div
                      className="mb-5 rounded-xl p-5"
                      style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <p
                        className="mb-4 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: '#475569' }}
                      >
                        How CipherWrap helps today
                      </p>
                      <div className="flex flex-col gap-3">
                        {uc.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                              style={{ background: uc.accent.iconBg, color: uc.accent.text }}
                            >
                              {i + 1}
                            </span>
                            <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Honest next-step note */}
                    <div
                      className="mb-6 rounded-lg px-4 py-3"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
                        <span style={{ color: '#64748b' }}>Next step:</span>{' '}{uc.nextStep}
                      </p>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-3">
                      <Link
                        href={uc.cta.href}
                        className="btn-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm"
                      >
                        {uc.cta.label}
                        <span aria-hidden>→</span>
                      </Link>
                      <Link
                        href={uc.ctaSecondary.href}
                        className="btn-ghost-blue inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
                        style={{ color: '#94a3b8' }}
                      >
                        {uc.ctaSecondary.label}
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            )
          })}
        </div>

        {/* ── Section divider ──────────────────────────────────────────────── */}
        <div className="section-glow my-16" />

        {/* ── Capability boundaries ────────────────────────────────────────── */}
        <Reveal>
          <div
            className="glass rounded-2xl p-7"
            style={{ borderColor: 'rgba(251,191,36,0.14)', background: 'rgba(8,15,40,0.6)' }}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: '#fbbf24' }}>
              What CipherWrap covers today
            </div>
            <h3 className="mb-4 font-display text-xl font-bold text-white">
              The foundation of every private financial workflow
            </h3>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: '#64748b' }}>
              These workflows require confidential transfers between parties — a capability that lives
              in the ERC-7984 wrapper contracts. CipherWrap today covers everything except the
              transfer step, which is an application-level operation between wrapped-token holders.
            </p>

            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { label: 'Discover wrappers', done: true, detail: 'Live registry read on every load' },
                { label: 'Faucet (mock tokens)', done: true, detail: 'One-click public mint for test tokens' },
                { label: 'Approve + Wrap', done: true, detail: 'FHE-encrypt your ERC-20 on-chain' },
                { label: 'Decrypt balance', done: true, detail: 'EIP-712 permit, zero gas, private result' },
                { label: 'Two-phase Unwrap', done: true, detail: 'Real finalizeUnwrap flow, no shortcuts' },
                { label: 'Confidential transfer', done: false, detail: 'Application-level — not part of the registry app scope' },
              ].map(({ label, done, detail }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-lg p-3"
                  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={done
                      ? { background: 'rgba(52,211,153,0.15)', color: '#34d399' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#475569' }
                    }
                  >
                    {done ? <CheckIcon /> : '–'}
                  </span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: done ? '#e2e8f0' : '#475569' }}>
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: '#334155' }}>{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="btn-gold inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm">
                Start Guided Demo →
              </Link>
              <Link
                href="/developers"
                className="btn-ghost-blue inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
                style={{ color: '#c4b5fd' }}
              >
                Developer Kit →
              </Link>
              <Link
                href="/registry"
                className="btn-ghost-blue inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm"
                style={{ color: '#475569' }}
              >
                Browse Registry
              </Link>
            </div>
          </div>
        </Reveal>

      </div>
    </div>
  )
}
