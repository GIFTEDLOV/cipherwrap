import { describe, it, expect } from 'vitest'
import {
  classifyPairs,
  pairMatchesSearch,
  type RawRegistryPair,
  type ClassifiedPair,
} from './registryIntelligence'
import type { KnownWrapper } from '@/config/zamaSepolia'

// ── test fixtures ─────────────────────────────────────────────────────────────

const ADDR = {
  wrapperUSDC:    '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639' as const,
  wrapperTGBP:    '0xfCE5c7069c5525eF6c8C2b2E35A745bA20a2F7CC' as const, // ctGBPMock
  wrapperTGBPR:   '0x167DC962808B32CFFFc7e14B5018c0bE06A3A208' as const, // ctGBP (restricted)
  wrapperUnknown: '0xDEAD000000000000000000000000000000000001' as const,
  underlying:     '0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF' as const,
}

const META_USDC: KnownWrapper = {
  wrapper: ADDR.wrapperUSDC,
  underlying: ADDR.underlying,
  symbol: 'cUSDCMock',
  name: 'Confidential USDC (Mock)',
  faucet: 'public-mock',
}

const META_TGBP_MOCK: KnownWrapper = {
  wrapper: ADDR.wrapperTGBP,
  underlying: '0x93c931278A2aad1916783F952f94276eA5111442' as const,
  symbol: 'ctGBPMock',
  name: 'Confidential tGBP (Mock)',
  faucet: 'public-mock',
}

const META_TGBP_RESTRICTED: KnownWrapper = {
  wrapper: ADDR.wrapperTGBPR,
  underlying: '0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3' as const,
  symbol: 'ctGBP',
  name: 'Confidential tGBP',
  faucet: 'restricted',
}

function makePair(
  wrapper: `0x${string}`,
  isValid = true,
): RawRegistryPair {
  return {
    confidentialTokenAddress: wrapper,
    tokenAddress: ADDR.underlying,
    isValid,
  }
}

function lookup(
  known: KnownWrapper[],
): (addr: string) => KnownWrapper | undefined {
  return (addr) =>
    known.find((k) => k.wrapper.toLowerCase() === addr.toLowerCase())
}

// ── valid / revoked ───────────────────────────────────────────────────────────

describe('valid pair', () => {
  const [result] = classifyPairs(
    [makePair(ADDR.wrapperUSDC, true)],
    lookup([META_USDC]),
  )

  it('has status valid', () => expect(result.status).toBe('valid'))
  it('isValid is true', () => expect(result.isValid).toBe(true))
  it('can wrap', () => expect(result.actions.canWrap).toBe(true))
  it('has no wrap block reason', () => expect(result.actions.wrapBlockReason).toBeNull())
  it('can unwrap', () => expect(result.actions.canUnwrap).toBe(true))
  it('has no unwrap block reason', () => expect(result.actions.unwrapBlockReason).toBeNull())
})

describe('revoked pair', () => {
  const [result] = classifyPairs(
    [makePair(ADDR.wrapperUSDC, false)],
    lookup([META_USDC]),
  )

  it('has status revoked', () => expect(result.status).toBe('revoked'))
  it('cannot wrap', () => expect(result.actions.canWrap).toBe(false))
  it('wrap block reason is set', () =>
    expect(result.actions.wrapBlockReason).toBeTruthy())
  it('cannot unwrap', () => expect(result.actions.canUnwrap).toBe(false))
  it('unwrap block reason is set', () =>
    expect(result.actions.unwrapBlockReason).toBeTruthy())
})

// ── faucet eligibility ────────────────────────────────────────────────────────

describe('public-mock faucet', () => {
  const [result] = classifyPairs(
    [makePair(ADDR.wrapperUSDC)],
    lookup([META_USDC]),
  )

  it('faucet is public-mock', () => expect(result.faucet).toBe('public-mock'))
  it('can use faucet', () => expect(result.actions.canFaucet).toBe(true))
  it('has no faucet block reason', () => expect(result.actions.faucetBlockReason).toBeNull())
})

describe('restricted faucet', () => {
  const [result] = classifyPairs(
    [makePair(ADDR.wrapperTGBPR)],
    lookup([META_TGBP_RESTRICTED]),
  )

  it('faucet is restricted', () => expect(result.faucet).toBe('restricted'))
  it('cannot use faucet', () => expect(result.actions.canFaucet).toBe(false))
  it('faucet block reason mentions restricted', () =>
    expect(result.actions.faucetBlockReason?.toLowerCase()).toContain('restricted'))
})

describe('unknown token — no metadata', () => {
  const [result] = classifyPairs(
    [makePair(ADDR.wrapperUnknown)],
    lookup([]), // empty known list
  )

  it('faucet is none', () => expect(result.faucet).toBe('none'))
  it('cannot use faucet', () => expect(result.actions.canFaucet).toBe(false))
  it('faucet block reason is set', () =>
    expect(result.actions.faucetBlockReason).toBeTruthy())
  it('metadata is null', () => expect(result.metadata).toBeNull())
  it('needs review', () => expect(result.needsReview).toBe(true))
  it('has unknown-metadata flag', () =>
    expect(result.reviewFlags).toContain('unknown-metadata'))
  it('displaySymbol falls back to ?', () => expect(result.displaySymbol).toBe('?'))
  it('displayName falls back to Unknown token', () =>
    expect(result.displayName).toBe('Unknown token'))
})

// ── duplicate symbol detection ────────────────────────────────────────────────

describe('duplicate symbol — both tGBP wrappers', () => {
  const results = classifyPairs(
    [makePair(ADDR.wrapperTGBP), makePair(ADDR.wrapperTGBPR)],
    lookup([META_TGBP_MOCK, META_TGBP_RESTRICTED]),
  )

  it('returns two classified pairs', () => expect(results).toHaveLength(2))

  it('ctGBPMock is flagged as duplicate', () => {
    const r = results.find((p) => p.displaySymbol === 'ctGBPMock')!
    expect(r.isDuplicate).toBe(true)
  })

  it('ctGBP is flagged as duplicate', () => {
    const r = results.find((p) => p.displaySymbol === 'ctGBP')!
    expect(r.isDuplicate).toBe(true)
  })

  it('both have duplicate-symbol review flag', () => {
    for (const r of results) {
      expect(r.reviewFlags).toContain('duplicate-symbol')
      expect(r.needsReview).toBe(true)
    }
  })
})

describe('non-duplicate token', () => {
  const results = classifyPairs(
    [makePair(ADDR.wrapperUSDC), makePair(ADDR.wrapperTGBP)],
    lookup([META_USDC, META_TGBP_MOCK]),
  )

  it('cUSDCMock is NOT a duplicate', () => {
    const r = results.find((p) => p.displaySymbol === 'cUSDCMock')!
    expect(r.isDuplicate).toBe(false)
  })

  it('cUSDCMock does not need review', () => {
    const r = results.find((p) => p.displaySymbol === 'cUSDCMock')!
    expect(r.needsReview).toBe(false)
  })
})

// ── mixed set — revoked AND unknown AND duplicates ────────────────────────────

describe('mixed registry set', () => {
  const pairs = [
    makePair(ADDR.wrapperUSDC, true),
    makePair(ADDR.wrapperTGBP, true),
    makePair(ADDR.wrapperTGBPR, false),  // revoked
    makePair(ADDR.wrapperUnknown, true), // unknown
  ]
  const results = classifyPairs(
    pairs,
    lookup([META_USDC, META_TGBP_MOCK, META_TGBP_RESTRICTED]),
  )

  it('returns four results', () => expect(results).toHaveLength(4))

  it('revoked pair cannot wrap or unwrap', () => {
    const r = results.find((p) => p.wrapperAddress.toLowerCase() === ADDR.wrapperTGBPR.toLowerCase())!
    expect(r.actions.canWrap).toBe(false)
    expect(r.actions.canUnwrap).toBe(false)
  })

  it('unknown pair needs review', () => {
    const r = results.find((p) => p.wrapperAddress.toLowerCase() === ADDR.wrapperUnknown.toLowerCase())!
    expect(r.needsReview).toBe(true)
    expect(r.metadata).toBeNull()
  })
})

// ── pairMatchesSearch ─────────────────────────────────────────────────────────

describe('pairMatchesSearch', () => {
  const pair: ClassifiedPair = {
    wrapperAddress: ADDR.wrapperUSDC,
    underlyingAddress: ADDR.underlying,
    isValid: true,
    status: 'valid',
    faucet: 'public-mock',
    metadata: META_USDC,
    isDuplicate: false,
    needsReview: false,
    reviewFlags: [],
    displaySymbol: 'cUSDCMock',
    displayName: 'Confidential USDC (Mock)',
    actions: {
      canWrap: true, wrapBlockReason: null,
      canUnwrap: true, unwrapBlockReason: null,
      canFaucet: true, faucetBlockReason: null,
    },
  }

  it('empty term matches everything', () => expect(pairMatchesSearch(pair, '')).toBe(true))
  it('matches by symbol (exact)', () => expect(pairMatchesSearch(pair, 'cUSDCMock')).toBe(true))
  it('matches by symbol (partial lowercase)', () => expect(pairMatchesSearch(pair, 'usdc')).toBe(true))
  it('matches by name (partial)', () => expect(pairMatchesSearch(pair, 'confidential usdc')).toBe(true))
  it('matches by wrapper address (partial)', () =>
    expect(pairMatchesSearch(pair, '7c5b')).toBe(true))
  it('matches by underlying address (partial)', () =>
    expect(pairMatchesSearch(pair, '9b5c')).toBe(true))
  it('does not match unrelated term', () => expect(pairMatchesSearch(pair, 'tgbp')).toBe(false))
})
