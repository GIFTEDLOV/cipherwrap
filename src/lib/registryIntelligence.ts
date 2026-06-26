/**
 * Registry Intelligence — pure classification layer.
 *
 * classifyPairs() takes raw on-chain pairs and a metadata lookup function, and
 * returns one ClassifiedPair per entry with status, faucet eligibility, duplicate
 * detection, review flags, and action gates (what is enabled and WHY NOT when
 * disabled).  No hooks, no network, no React — safe to import anywhere.
 */

import { getKnownWrapper, type KnownWrapper } from '@/config/zamaSepolia'

// ── input ─────────────────────────────────────────────────────────────────────

export interface RawRegistryPair {
  tokenAddress: `0x${string}`
  confidentialTokenAddress: `0x${string}`
  isValid: boolean
}

// ── output ────────────────────────────────────────────────────────────────────

export type PairStatus = 'valid' | 'revoked'
export type FaucetEligibility = 'public-mock' | 'restricted' | 'none'
export type ReviewFlag = 'unknown-metadata' | 'duplicate-symbol'

export interface ActionGates {
  canWrap: boolean
  /** Human-readable reason wrap is blocked; null when canWrap is true. */
  wrapBlockReason: string | null
  canUnwrap: boolean
  /** Human-readable reason unwrap is blocked; null when canUnwrap is true. */
  unwrapBlockReason: string | null
  canFaucet: boolean
  /** Human-readable reason faucet is blocked; null when canFaucet is true. */
  faucetBlockReason: string | null
}

export interface ClassifiedPair {
  // Raw registry fields
  wrapperAddress: `0x${string}`
  underlyingAddress: `0x${string}`
  isValid: boolean

  // Classification
  status: PairStatus
  faucet: FaucetEligibility
  metadata: KnownWrapper | null
  isDuplicate: boolean
  needsReview: boolean
  reviewFlags: ReviewFlag[]

  // Safe display values — never undefined, safe to render directly
  displaySymbol: string
  displayName: string

  // Action gates with block reasons for tooltips / disabled-state UI
  actions: ActionGates
}

// ── internal helpers ──────────────────────────────────────────────────────────

/**
 * Normalises a wrapper symbol to a base-asset key for duplicate detection.
 * Strips the confidential 'c' prefix and any trailing 'Mock' suffix (case-
 * insensitive), then lowercases, so that e.g. both 'ctGBP' and 'ctGBPMock'
 * collapse to the same key 'tgbp' and are flagged as duplicates.
 */
function resolveBaseSymbol(symbol: string): string {
  return symbol
    .replace(/^c/, '')       // strip leading confidential 'c'
    .replace(/Mock$/i, '')   // strip trailing 'Mock'/'mock'
    .toLowerCase()
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Classify every raw registry pair.
 *
 * @param rawPairs - Live pairs from getTokenConfidentialTokenPairs().
 * @param lookup   - Metadata lookup by wrapper address; defaults to the static
 *                   known-wrappers config. Pass your own function in tests to
 *                   avoid depending on the static config.
 */
export function classifyPairs(
  rawPairs: RawRegistryPair[],
  lookup: (address: string) => KnownWrapper | undefined = getKnownWrapper,
): ClassifiedPair[] {
  // Pass 1 — enrich each pair with its static metadata
  const enriched = rawPairs.map((pair) => ({
    pair,
    meta: lookup(pair.confidentialTokenAddress) ?? null,
  }))

  // Pass 2 — count how many known entries share each base-asset symbol
  //           so we can flag duplicates across the full set
  const baseSymbolCount = new Map<string, number>()
  for (const { meta } of enriched) {
    if (!meta) continue
    const key = resolveBaseSymbol(meta.symbol)
    baseSymbolCount.set(key, (baseSymbolCount.get(key) ?? 0) + 1)
  }

  // Pass 3 — produce final classified pairs
  return enriched.map(({ pair, meta }) => {
    const status: PairStatus = pair.isValid ? 'valid' : 'revoked'

    const faucet: FaucetEligibility = !meta
      ? 'none'
      : meta.faucet === 'public-mock'
        ? 'public-mock'
        : 'restricted'

    const isDuplicate =
      meta !== null &&
      (baseSymbolCount.get(resolveBaseSymbol(meta.symbol)) ?? 0) > 1

    const reviewFlags: ReviewFlag[] = []
    if (meta === null) reviewFlags.push('unknown-metadata')
    if (isDuplicate) reviewFlags.push('duplicate-symbol')

    const needsReview = reviewFlags.length > 0

    const displaySymbol = meta?.symbol ?? '?'
    const displayName = meta?.name ?? 'Unknown token'

    const canWrap = pair.isValid
    const canUnwrap = pair.isValid
    const canFaucet = faucet === 'public-mock'

    const actions: ActionGates = {
      canWrap,
      wrapBlockReason: canWrap ? null : 'Pair is revoked in the registry',
      canUnwrap,
      unwrapBlockReason: canUnwrap ? null : 'Pair is revoked in the registry',
      canFaucet,
      faucetBlockReason: canFaucet
        ? null
        : faucet === 'restricted'
          ? 'This token has restricted minting — no public faucet'
          : 'No faucet available for unknown tokens',
    }

    return {
      wrapperAddress: pair.confidentialTokenAddress,
      underlyingAddress: pair.tokenAddress,
      isValid: pair.isValid,
      status,
      faucet,
      metadata: meta,
      isDuplicate,
      needsReview,
      reviewFlags,
      displaySymbol,
      displayName,
      actions,
    } satisfies ClassifiedPair
  })
}

// ── search helper (used by the registry page) ─────────────────────────────────

/** Returns true if pair matches the search term (symbol / name / address). */
export function pairMatchesSearch(
  pair: ClassifiedPair,
  term: string,
): boolean {
  if (!term) return true
  const q = term.toLowerCase()
  return (
    pair.displaySymbol.toLowerCase().includes(q) ||
    pair.displayName.toLowerCase().includes(q) ||
    pair.wrapperAddress.toLowerCase().includes(q) ||
    pair.underlyingAddress.toLowerCase().includes(q)
  )
}
