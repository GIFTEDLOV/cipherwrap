'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  WRAPPERS_REGISTRY,
  KNOWN_WRAPPERS,
  SEPOLIA_CHAIN_ID,
  type KnownWrapper,
} from '@/config/zamaSepolia'
import { CodeBlock } from '@/components/CodeBlock'
import {
  makeConfigSnippet,
  makeRegistrySnippet,
  makeWrapSnippet,
  makeDecryptSnippet,
  makeUnwrapSnippet,
  type SnippetParams,
} from '@/lib/devSnippets'

// ── static registry snippet (doesn't change per-token) ───────────────────────

const REGISTRY_SNIPPET = makeRegistrySnippet(WRAPPERS_REGISTRY)

// ── wrapper rows from single source of truth ──────────────────────────────────

const WRAPPER_ROWS: KnownWrapper[] = Object.values(KNOWN_WRAPPERS)

function deriveUnderlyingSymbol(symbol: string): string {
  return symbol.replace(/^c/, '') // 'cUSDCMock' → 'USDCMock', 'ctGBP' → 'tGBP'
}

// ── small shared atoms ────────────────────────────────────────────────────────

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }}
      className="rounded bg-space-700 px-1.5 py-0.5 text-xs text-slate-300 hover:bg-space-600"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-900/20 bg-space-800/50 px-4 py-3 backdrop-blur-sm">
      <span className="w-32 shrink-0 text-xs text-slate-500">{label}</span>
      <code className="flex-1 break-all font-mono text-xs text-slate-300">
        {address}
      </code>
      <div className="flex items-center gap-2">
        <CopyInline text={address} />
        <a
          href={`https://sepolia.etherscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cipher-400 underline hover:text-cipher-300"
        >
          Etherscan ↗
        </a>
      </div>
    </div>
  )
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-bold text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DevelopersPage() {
  // Wrapper selector state — drives all per-token snippets
  const keys = Object.keys(KNOWN_WRAPPERS)
  const [selectedKey, setSelectedKey] = useState(keys[0])
  const selected = KNOWN_WRAPPERS[selectedKey]

  const snippetParams: SnippetParams = {
    wrapperAddress:    selected.wrapper,
    underlyingAddress: selected.underlying,
    symbol:            selected.symbol,
    underlyingSymbol:  deriveUnderlyingSymbol(selected.symbol),
    decimals:          selected.decimals ?? 6,
    chainId:           SEPOLIA_CHAIN_ID,
    registry:          WRAPPERS_REGISTRY,
    name:              selected.name,
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="mb-3 inline-block rounded-full border border-cipher-500/30 bg-cipher-500/10 px-3 py-1 font-mono text-xs font-medium uppercase tracking-widest text-cipher-400">
          Developer Kit
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-100">
          Build with the official Zama registry
        </h1>
        <p className="mt-3 leading-relaxed text-slate-500">
          Every snippet on this page uses real, verified Sepolia addresses from{' '}
          <code className="rounded bg-space-700 px-1 text-xs text-slate-300">
            src/config/zamaSepolia.ts
          </code>
          {' '}— the single source of truth in CipherWrap.
          Addresses interpolated at build time; they can&apos;t go stale.
        </p>
      </div>

      <div className="flex flex-col gap-12">

        {/* ── Why the official registry matters ─────────────────────────── */}
        <section className="rounded-xl border border-cipher-700/30 bg-cipher-500/5 p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-cipher-400">
            Why use the official registry?
          </h2>
          <div className="flex flex-col gap-2 text-sm text-slate-400">
            <p>
              The Zama Wrappers Registry is the canonical on-chain index of all
              production-grade ERC-7984 confidential wrappers for Sepolia.
              Integrating it — rather than deploying your own throwaway wrapper —
              gives you:
            </p>
            <ul className="ml-4 flex list-disc flex-col gap-1 text-slate-500">
              <li>
                <span className="text-slate-300">Shared liquidity.</span>{' '}
                Your users share depth with every other app that wraps the same
                underlying token.
              </li>
              <li>
                <span className="text-slate-300">Revocation visibility.</span>{' '}
                The <code className="rounded bg-space-700 px-0.5 text-xs">isValid</code>{' '}
                flag lets you disable wrap/unwrap instantly if a wrapper is
                deprecated — no redeployment needed.
              </li>
              <li>
                <span className="text-slate-300">One place to check for new pairs.</span>{' '}
                When Zama deploys new wrappers, your app discovers them
                automatically at runtime.
              </li>
            </ul>
          </div>
        </section>

        {/* ── 1. Read the registry ───────────────────────────────────────── */}
        <Section
          id="registry"
          title="1. Read all pairs from the registry"
          subtitle="One call returns every pair, including revoked ones. Filter by isValid before enabling actions."
        >
          <CodeBlock code={REGISTRY_SNIPPET} label="TypeScript · wagmi" />
        </Section>

        {/* ── 2. Per-token snippets ──────────────────────────────────────── */}
        <Section
          id="token-snippets"
          title="2. Token-specific snippets"
          subtitle="Select any known wrapper — all snippets update to show that pair's real addresses."
        >
          {/* Token selector */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-900/20 bg-space-800/50 p-4 backdrop-blur-sm">
            <span className="text-xs text-zinc-500">Token:</span>
            <div className="flex flex-wrap gap-2">
              {WRAPPER_ROWS.map((w) => (
                <button
                  key={w.wrapper}
                  onClick={() => setSelectedKey(w.wrapper.toLowerCase())}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedKey === w.wrapper.toLowerCase()
                      ? 'bg-cipher-500 text-zinc-950'
                      : 'border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {w.symbol}
                </button>
              ))}
            </div>
            {selected.faucet === 'restricted' && (
              <span className="ml-auto rounded bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-500">
                Restricted mint — no faucet
              </span>
            )}
            {selected.note && (
              <p className="w-full text-xs text-amber-500">{selected.note}</p>
            )}
          </div>

          {/* 2a. Config object */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
              a. Config object
            </p>
            <CodeBlock
              code={makeConfigSnippet(snippetParams)}
              label={`TypeScript · ${snippetParams.symbol}`}
            />
          </div>

          {/* 2b. Approve + Wrap */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
              b. Approve + Wrap (shield)
            </p>
            <CodeBlock
              code={makeWrapSnippet(snippetParams)}
              label={`TypeScript · @zama-fhe/react-sdk · ${snippetParams.symbol}`}
            />
          </div>

          {/* 2c. Decrypt */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
              c. Decrypt confidential balance
            </p>
            <CodeBlock
              code={makeDecryptSnippet(snippetParams)}
              label={`TypeScript · @zama-fhe/react-sdk · ${snippetParams.symbol}`}
            />
          </div>

          {/* 2d. Unwrap */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
              d. Unwrap (two-phase unshield)
            </p>
            <CodeBlock
              code={makeUnwrapSnippet(snippetParams)}
              label={`TypeScript · @zama-fhe/react-sdk · ${snippetParams.symbol}`}
            />
            <p className="mt-2 text-xs text-zinc-600">
              If finalization is interrupted, use{' '}
              <code className="rounded bg-zinc-800 px-0.5 text-zinc-400">
                useResumeUnshield(wrapperAddress)
              </code>{' '}
              with the original phase-1 tx hash to continue from phase 2.
            </p>
          </div>
        </Section>

        {/* ── 3. Verified Sepolia addresses ─────────────────────────────── */}
        <Section
          id="addresses"
          title="3. Verified Sepolia contract addresses"
          subtitle="All addresses verified against the official Zama protocol-apps repository. Do not use unverified addresses."
        >
          <AddressRow label="Wrappers Registry" address={WRAPPERS_REGISTRY} />

          <div className="overflow-hidden rounded-xl border border-blue-900/20">
            <div className="border-b border-blue-900/20 bg-space-800/60 px-4 py-2">
              <p className="text-xs text-slate-500">
                Known wrapper pairs · Sepolia (chainId {SEPOLIA_CHAIN_ID})
              </p>
            </div>
            <div className="divide-y divide-blue-900/15">
              {WRAPPER_ROWS.map((row) => (
                <div key={row.wrapper} className="bg-space-800/30 px-4 py-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/token/${row.wrapper}`}
                      className="font-mono text-sm font-semibold text-slate-200 hover:text-cipher-300"
                    >
                      {row.symbol}
                    </Link>
                    <span className="text-xs text-slate-600">{row.name}</span>
                    <span
                      className={`ml-auto rounded px-1.5 py-0.5 text-xs font-medium ${
                        row.faucet === 'public-mock'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-space-700/50 text-slate-500'
                      }`}
                    >
                      {row.faucet === 'public-mock' ? 'Public faucet' : 'Restricted'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-20 text-xs text-slate-600">Wrapper</span>
                      <code className="flex-1 break-all font-mono text-xs text-slate-400">
                        {row.wrapper}
                      </code>
                      <CopyInline text={row.wrapper} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-20 text-xs text-slate-600">Underlying</span>
                      <code className="flex-1 break-all font-mono text-xs text-slate-400">
                        {row.underlying}
                      </code>
                      <CopyInline text={row.underlying} />
                    </div>
                    {row.decimals !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="w-20 text-xs text-slate-600">Decimals</span>
                        <span className="font-mono text-xs text-slate-500">{row.decimals}</span>
                      </div>
                    )}
                    {row.note && (
                      <p className="mt-0.5 text-xs text-amber-600">{row.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── 4. Resources ──────────────────────────────────────────────── */}
        <Section
          id="resources"
          title="4. Resources"
          subtitle="Official Zama documentation and standards."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                label: 'Zama FHE React SDK docs',
                href: 'https://docs.zama.ai',
                desc: 'Hook API reference, EIP-712 permit model, FHE fundamentals',
              },
              {
                label: 'ERC-7984 standard',
                href: 'https://eips.ethereum.org/EIPS/eip-7984',
                desc: 'The confidential token wrapper interface CipherWrap implements',
              },
              {
                label: 'protocol-apps — Sepolia addresses',
                href: 'https://github.com/zama-ai/protocol-apps/blob/main/docs/addresses/testnet/sepolia.md',
                desc: 'Authoritative address list (source of truth for this page)',
              },
              {
                label: 'CipherWrap /demo',
                href: '/demo',
                desc: 'Live walkthrough: connect → faucet → wrap → decrypt → unwrap',
              },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="group rounded-xl border border-blue-900/20 bg-space-800/50 p-4 backdrop-blur-sm transition-colors hover:border-blue-700/30"
              >
                <p className="text-sm font-semibold text-cipher-300 group-hover:text-cipher-200">
                  {link.label} ↗
                </p>
                <p className="mt-1 text-xs text-slate-600">{link.desc}</p>
              </a>
            ))}
          </div>
        </Section>

      </div>
    </div>
  )
}
