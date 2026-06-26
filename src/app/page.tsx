import Link from 'next/link'

// ── how it works steps ────────────────────────────────────────────────────────

const HOW_STEPS = [
  {
    n: '1',
    label: 'You hold a plaintext ERC-20',
    body: 'Your balance is a public integer on-chain. Any node, block explorer, or contract can read it at any time.',
    highlight: false,
  },
  {
    n: '2',
    label: 'Wrap → FHE ciphertext on-chain',
    body: 'CipherWrap deposits your tokens into a Zama ERC-7984 wrapper. Your balance becomes an encrypted ciphertext handle — unreadable to anyone without your explicit permission.',
    highlight: true,
  },
  {
    n: '3',
    label: 'Decrypt only when you want',
    body: 'You sign an EIP-712 permit (zero gas, off-chain). The Zama FHE network produces a user-specific decryption — only readable by you. Nobody else can decrypt it, not even the contract owner.',
    highlight: false,
  },
]

// ── nav cards ─────────────────────────────────────────────────────────────────

const NAV_CARDS = [
  {
    href: '/demo',
    label: 'Guided Demo',
    badge: 'Best starting point',
    badgeCls: 'bg-cipher-500/15 text-cipher-400',
    desc: 'Step-by-step walkthrough: connect → faucet → wrap → decrypt → unwrap. Designed for first-time visitors and bounty judges.',
    primary: true,
  },
  {
    href: '/registry',
    label: 'Registry Browser',
    badge: 'Live on-chain',
    badgeCls: 'bg-zinc-700/50 text-zinc-400',
    desc: 'All Zama confidential token pairs, live from the registry contract. Validity badges, duplicate detection, faucet eligibility.',
    primary: false,
  },
  {
    href: '/developers',
    label: 'Developer Kit',
    badge: 'Copy-paste ready',
    badgeCls: 'bg-zinc-700/50 text-zinc-400',
    desc: 'Hook signatures, ABI snippets, and contract addresses for every operation — ready to drop into your own project.',
    primary: false,
  },
]

// ── feature pills ─────────────────────────────────────────────────────────────

const FEATURES = [
  'Live registry reads — no static data',
  'isValid checked per pair',
  'Duplicate & unknown entry detection',
  'Real EIP-712 user decryption',
  'Honest two-phase unwrap flow',
  'Deployed on Sepolia',
]

// ── page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-16">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="mb-16 flex flex-col items-center gap-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cipher-500/25 bg-cipher-500/8 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cipher-400" />
          <span className="font-mono text-xs font-medium uppercase tracking-widest text-cipher-400">
            Zama Developer Program · Season 3
          </span>
        </div>

        <div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-cipher-400 to-teal-300 bg-clip-text text-transparent">
              Cipher
            </span>
            <span className="text-zinc-100">Wrap</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-zinc-400">
            The official{' '}
            <span className="text-zinc-200">Zama Confidential Token Wrappers Registry</span>
            {' '}— made usable. Discover, classify, wrap, decrypt, and unwrap
            confidential ERC-7984 tokens on Sepolia.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="rounded-xl bg-cipher-500 px-7 py-3.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-cipher-400"
          >
            Start the guided demo →
          </Link>
          <Link
            href="/registry"
            className="rounded-xl border border-zinc-700 px-7 py-3.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
          >
            Explore Registry
          </Link>
        </div>

        <p className="text-xs text-zinc-600">
          Connect wallet using the button in the top right to begin.
          {' '}No mainnet. Sepolia only.
        </p>
      </div>

      {/* ── How confidential tokens work ──────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-bold text-zinc-100">
          How confidential tokens work
        </h2>
        <p className="mb-6 text-sm text-zinc-500">
          Zama&apos;s ERC-7984 standard uses Fully Homomorphic Encryption (FHE) to keep
          on-chain balances private by default.
        </p>

        <div className="relative flex flex-col gap-0">
          {HOW_STEPS.map((step, i) => (
            <div key={step.n} className="flex gap-4">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    step.highlight
                      ? 'bg-cipher-500 text-zinc-950'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {step.n}
                </div>
                {i < HOW_STEPS.length - 1 && (
                  <div className="my-1 w-px flex-1 bg-zinc-800" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-6 ${i === HOW_STEPS.length - 1 ? 'pb-0' : ''}`}>
                <p
                  className={`mb-1 text-sm font-semibold ${
                    step.highlight ? 'text-cipher-300' : 'text-zinc-200'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-sm leading-relaxed text-zinc-500">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── What CipherWrap provides ──────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-1 text-lg font-bold text-zinc-100">
          What CipherWrap provides
        </h2>
        <p className="mb-5 text-sm text-zinc-500">
          A production-grade interface over the Zama registry contract — no shortcuts,
          no fake operations.
        </p>
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      {/* ── Navigation cards ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-5 text-lg font-bold text-zinc-100">Where to go next</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`group flex flex-col gap-2 rounded-xl border p-5 transition-all ${
                card.primary
                  ? 'border-cipher-700/50 bg-cipher-500/5 hover:border-cipher-600/60 hover:bg-cipher-500/10'
                  : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm font-semibold ${
                    card.primary ? 'text-cipher-300 group-hover:text-cipher-200' : 'text-zinc-200'
                  }`}
                >
                  {card.label}
                </p>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${card.badgeCls}`}
                >
                  {card.badge}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">{card.desc}</p>
              <p
                className={`mt-auto pt-1 text-xs font-medium ${
                  card.primary ? 'text-cipher-400' : 'text-zinc-600'
                }`}
              >
                {card.label} →
              </p>
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
