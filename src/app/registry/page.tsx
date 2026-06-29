'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAccount, useReadContract } from 'wagmi'
import { useChainGuard } from '@/components/ChainGuard'
import { registryAbi } from '@/abis/registry'
import {
  WRAPPERS_REGISTRY,
  SEPOLIA_CHAIN_ID,
} from '@/config/zamaSepolia'
import {
  classifyPairs,
  pairMatchesSearch,
  type ClassifiedPair,
  type FaucetEligibility,
  type PairStatus,
  type RawRegistryPair,
} from '@/lib/registryIntelligence'
import { WrongNetworkBanner } from '@/components/WrongNetworkBanner'

type FilterKey = 'all' | 'valid' | 'faucet' | 'review'

// ── address helpers ──────────────────────────────────────────────────────────

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function etherscanHref(addr: string) {
  return `https://sepolia.etherscan.io/address/${addr}`
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="rounded px-1 py-0.5 text-xs text-slate-500 transition-colors hover:bg-space-700 hover:text-blue-300"
      title="Copy to clipboard"
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function AddressRow({ label, addr }: { label: string; addr: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs text-slate-500">{label}</span>
      <a
        href={etherscanHref(addr)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-mono text-xs text-slate-400 hover:text-cipher-400"
        title={addr}
      >
        {shorten(addr)}
      </a>
      <CopyButton text={addr} />
    </div>
  )
}

// ── badges ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PairStatus }) {
  return status === 'valid' ? (
    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
      Valid
    </span>
  ) : (
    <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
      Revoked
    </span>
  )
}

function FaucetBadge({
  faucet,
  blockReason,
}: {
  faucet: FaucetEligibility
  blockReason: string | null
}) {
  if (faucet === 'public-mock')
    return (
      <span className="rounded bg-cipher-500/15 px-2 py-0.5 text-xs font-medium text-cipher-400">
        Faucet
      </span>
    )
  if (faucet === 'restricted')
    return (
      <span
        className="rounded bg-space-700 px-2 py-0.5 text-xs text-slate-400"
        title={blockReason ?? undefined}
      >
        Restricted
      </span>
    )
  return null
}

function DuplicateBadge() {
  return (
    <span
      className="rounded border border-amber-700/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400"
      title="Multiple wrappers share the same base asset on Sepolia — verify which one you intend to use"
    >
      Duplicate ⚠
    </span>
  )
}

function UnknownBadge() {
  return (
    <span
      className="rounded border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300"
      title="This address is not in the known-wrappers list — treat with caution"
    >
      Unknown ⚠
    </span>
  )
}

// ── pair card ─────────────────────────────────────────────────────────────────

function PairCard({ pair }: { pair: ClassifiedPair }) {
  const cardCls =
    pair.status === 'revoked'
      ? 'border-red-900/40 bg-red-950/10 hover:border-red-800/50'
      : 'border-blue-900/20 bg-space-800/60 hover:border-blue-700/30 hover:bg-space-800/80'

  return (
    <Link
      href={`/token/${pair.wrapperAddress}`}
      className={`group block rounded-xl border p-4 backdrop-blur-sm transition-all duration-150 ${cardCls}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {pair.metadata === null ? (
            <p className="font-semibold text-slate-400">Unknown token</p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold tracking-tight text-slate-100">
                {pair.displaySymbol}
              </span>
              <span className="text-sm text-slate-500">{pair.displayName}</span>
            </div>
          )}
          {pair.metadata?.note && (
            <p className="mt-0.5 text-xs text-amber-500">{pair.metadata.note}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <StatusBadge status={pair.status} />
          <FaucetBadge
            faucet={pair.faucet}
            blockReason={pair.actions.faucetBlockReason}
          />
          {pair.isDuplicate && <DuplicateBadge />}
          {pair.metadata === null && <UnknownBadge />}
          <span className="ml-1 text-slate-600 transition-colors group-hover:text-blue-400">
            →
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-6">
        <AddressRow label="Wrapper" addr={pair.wrapperAddress} />
        <AddressRow label="Underlying" addr={pair.underlyingAddress} />
      </div>

      {pair.status === 'revoked' && (
        <p className="mt-2 text-xs text-red-600">
          Wrap and unwrap disabled — {pair.actions.wrapBlockReason?.toLowerCase()}
        </p>
      )}
    </Link>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-blue-900/20 bg-space-800/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-28 rounded bg-space-700" />
          <div className="h-4 w-44 rounded bg-space-700/60" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-5 w-12 rounded bg-space-700" />
          <div className="h-5 w-14 rounded bg-space-700" />
        </div>
      </div>
      <div className="flex gap-6">
        <div className="h-4 w-40 rounded bg-space-700" />
        <div className="h-4 w-40 rounded bg-space-700" />
      </div>
    </div>
  )
}

// ── filter pill ───────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean
  onClick: () => void
  count: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-cipher-600/50 bg-cipher-500/10 font-medium text-cipher-300'
          : 'border-space-700/50 text-slate-500 hover:border-space-600/60 hover:text-slate-300'
      }`}
    >
      {children}
      <span
        className={`rounded px-1 py-0.5 text-xs ${
          active ? 'bg-cipher-500/20 text-cipher-400' : 'bg-space-700 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function RegistryPage() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')

  const { isConnected } = useAccount()
  const { onSepolia } = useChainGuard()

  const {
    data: pairsResult,
    isLoading,
    isFetching,
    failureCount,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useReadContract({
    address: WRAPPERS_REGISTRY,
    abi: registryAbi,
    functionName: 'getTokenConfidentialTokenPairs',
    query: {
      retry: 3,
      retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 8000),
    },
  })

  const rawPairs = (pairsResult as RawRegistryPair[] | undefined) ?? []
  const classified = classifyPairs(rawPairs)

  const stats = {
    total: classified.length,
    valid: classified.filter((p) => p.isValid).length,
    revoked: classified.filter((p) => !p.isValid).length,
    faucets: classified.filter((p) => p.faucet === 'public-mock').length,
    review: classified.filter((p) => p.needsReview).length,
  }

  const visible = classified
    .filter((p) => {
      if (activeFilter === 'valid') return p.isValid
      if (activeFilter === 'faucet') return p.faucet === 'public-mock'
      if (activeFilter === 'review') return p.needsReview
      return true
    })
    .filter((p) => pairMatchesSearch(p, search))

  const filterCounts: Record<FilterKey, number> = {
    all: classified.length,
    valid: classified.filter((p) => p.isValid).length,
    faucet: classified.filter((p) => p.faucet === 'public-mock').length,
    review: classified.filter((p) => p.needsReview).length,
  }

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : null

  const isRetrying = failureCount > 0 && isFetching && !isError
  const isFailed = isError && !isFetching

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
            Wrapper Registry
          </h1>
          {isFetching && !isRetrying && !isError && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Live
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Live read from{' '}
          <a
            href={etherscanHref(WRAPPERS_REGISTRY)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-slate-400 hover:text-cipher-400"
            title={WRAPPERS_REGISTRY}
          >
            {shorten(WRAPPERS_REGISTRY)}
          </a>
          {' '}via{' '}
          <code className="rounded bg-space-700 px-1 text-xs text-slate-300">
            getTokenConfidentialTokenPairs()
          </code>
          {' · '}Sepolia
        </p>
        <p className="mt-1.5 text-xs text-slate-600">
          These wrappers power private invoices, payroll, and investor distributions.{' '}
          <Link href="/use-cases" className="text-slate-500 underline underline-offset-2 hover:text-slate-300 transition-colors">
            See real-world workflows →
          </Link>
        </p>
      </div>

      {/* ── Network / connection banners ────────────────────────────────────── */}
      {!isConnected && (
        <div className="mb-5 rounded-lg border border-space-700/40 bg-space-800/40 px-4 py-2.5 text-sm text-slate-500">
          Connect your wallet to enable wrap, unwrap, and faucet on the detail
          page. Registry data is public and visible regardless.
        </div>
      )}
      <WrongNetworkBanner />

      {/* ── Search + filter bar ─────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-600">
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by symbol, name, or address…"
            className="w-full rounded-xl border border-space-700 bg-space-800/70 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'all' as const, label: 'All' },
              { key: 'valid' as const, label: 'Valid' },
              { key: 'faucet' as const, label: 'Has faucet' },
              { key: 'review' as const, label: 'Needs review' },
            ] as const
          ).map(({ key, label }) => (
            <FilterPill
              key={key}
              active={activeFilter === key}
              onClick={() => setActiveFilter(key)}
              count={filterCounts[key]}
            >
              {label}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      {!isLoading && stats.total > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span>
            <span className="font-medium text-slate-300">{stats.total}</span> pairs
          </span>
          <span>
            <span className="font-medium text-emerald-400">{stats.valid}</span> valid
          </span>
          {stats.revoked > 0 && (
            <span>
              <span className="font-medium text-red-400">{stats.revoked}</span> revoked
            </span>
          )}
          <span>
            <span className="font-medium text-cipher-400">{stats.faucets}</span> with faucet
          </span>
          {stats.review > 0 && (
            <span>
              <span className="font-medium text-amber-400">{stats.review}</span> need review
            </span>
          )}
          {updatedAt && !isRetrying && (
            <span className="text-slate-700">Updated {updatedAt}</span>
          )}
          {isRetrying && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Retrying… (attempt {failureCount + 1} of 4)
            </span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="ml-auto rounded border border-space-700/50 px-2.5 py-1 text-slate-500 transition-colors hover:border-space-600/60 hover:text-slate-300 disabled:opacity-40"
          >
            ↺ Refresh
          </button>
        </div>
      )}

      {/* ── Loading — skeleton cards ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* ── Failed after retries ─────────────────────────────────────────────── */}
      {isFailed && !isLoading && (
        <div className="rounded-xl border border-space-700/40 bg-space-800/50 p-6 backdrop-blur-sm">
          <p className="font-medium text-slate-300">
            Could not reach the registry
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {(error as Error | null)?.message ?? 'RPC request failed after 3 retries.'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            The fallback transport tried multiple Sepolia RPC endpoints. Check
            your connection or set{' '}
            <code className="rounded bg-space-700 px-1">
              NEXT_PUBLIC_SEPOLIA_RPC_URL
            </code>{' '}
            to a private endpoint.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg border border-space-600/50 px-4 py-2 text-sm text-slate-400 hover:border-blue-700/50 hover:text-slate-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!isLoading && !isError && stats.total === 0 && (
        <div className="rounded-xl border border-space-700/40 bg-space-800/50 p-10 text-center backdrop-blur-sm">
          <p className="text-slate-400">No pairs returned by the registry.</p>
          <p className="mt-1 text-sm text-slate-600">
            The registry contract returned an empty list. This is unexpected on
            Sepolia — check the contract address or network.
          </p>
        </div>
      )}

      {/* ── Search empty state ───────────────────────────────────────────────── */}
      {!isLoading && !isError && stats.total > 0 && visible.length === 0 && (
        <div className="rounded-xl border border-space-700/40 bg-space-800/50 p-8 text-center backdrop-blur-sm">
          <p className="text-slate-400">No results for &ldquo;{search}&rdquo;</p>
          <button
            onClick={() => {
              setSearch('')
              setActiveFilter('all')
            }}
            className="mt-3 text-sm text-cipher-400 hover:text-cipher-300"
          >
            Clear search
          </button>
        </div>
      )}

      {/* ── Pair list ────────────────────────────────────────────────────────── */}
      {!isLoading && visible.length > 0 && (
        <div className="flex flex-col gap-3">
          {visible.map((pair) => (
            <PairCard key={pair.wrapperAddress} pair={pair} />
          ))}

          <p className="mt-2 text-center text-xs text-slate-700">
            Showing {visible.length} of {stats.total} registry entries ·{' '}
            <a
              href={etherscanHref(WRAPPERS_REGISTRY)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-500"
            >
              View registry contract ↗
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
