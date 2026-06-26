/**
 * Developer snippet generators.
 *
 * Pure functions — no React, no imports from config.
 * Takes real addresses as parameters so both /developers (interactive selector)
 * and /token/[wrapperAddress] (live registry data) can call them without
 * duplicating address strings.
 */

export interface SnippetParams {
  wrapperAddress: string
  underlyingAddress: string
  symbol: string
  underlyingSymbol: string
  decimals: number
  chainId: number
  registry: string
  name: string
}

// ── config object ─────────────────────────────────────────────────────────────

export function makeConfigSnippet(p: SnippetParams): string {
  return `// Drop this into your project — all values from the official Zama registry.
const TOKEN = {
  symbol:            '${p.symbol}',
  name:              '${p.name}',
  wrapperAddress:    '${p.wrapperAddress}',
  underlyingAddress: '${p.underlyingAddress}',
  registry:          '${p.registry}',  // official Zama Wrappers Registry
  chainId:           ${p.chainId},                  // Sepolia
  decimals:          ${p.decimals},
} as const`
}

// ── registry read ─────────────────────────────────────────────────────────────

export function makeRegistrySnippet(registry: string): string {
  return `import { useReadContract } from 'wagmi'

// Always read pairs live — never substitute a static list.
const { data: pairs } = useReadContract({
  address: '${registry}', // official Zama Wrappers Registry (Sepolia)
  abi: registryAbi,       // from src/abis/registry.ts in CipherWrap
  functionName: 'getTokenConfidentialTokenPairs',
})
// pairs: Array<{ confidentialTokenAddress, tokenAddress, isValid }>

// Always check isValid. Revoked pairs are still returned.
const valid = pairs?.filter((p) => p.isValid) ?? []`
}

// ── approve + wrap ────────────────────────────────────────────────────────────

export function makeWrapSnippet(p: SnippetParams): string {
  return `import { parseUnits } from 'viem'
import { useApproveUnderlying, useShield } from '@zama-fhe/react-sdk'

// Step 1 — approve the ${p.symbol} wrapper to pull ${p.underlyingSymbol}
const { mutate: approve } = useApproveUnderlying(
  '${p.wrapperAddress}',
)
approve({ amount: parseUnits('100', ${p.decimals}) })

// Step 2 — FHE-encrypt locally, then deposit (shield)
const { mutate: shield } = useShield({
  address: '${p.wrapperAddress}',
})
shield({
  amount: parseUnits('100', ${p.decimals}),
  approvalStrategy: 'skip',                     // pre-approved in step 1
  onShieldSubmitted: (txHash) => console.log('wrap tx:', txHash),
})
// On-chain your ${p.underlyingSymbol} balance becomes an FHE ciphertext handle.
// No observer — including the contract owner — can read your balance.`
}

// ── decrypt (user-specific EIP-712) ──────────────────────────────────────────

export function makeDecryptSnippet(p: SnippetParams): string {
  return `import { formatUnits } from 'viem'
import {
  useHasPermit,
  useGrantPermit,
  useConfidentialBalance,
} from '@zama-fhe/react-sdk'

const WRAPPER = '${p.wrapperAddress}' // ${p.symbol}

// Step 1 — grant a user-specific permit (off-chain EIP-712 — zero gas)
const { data: hasPermit } = useHasPermit({ contractAddresses: [WRAPPER] })
const { mutate: grantPermit } = useGrantPermit()
// call once: grantPermit([WRAPPER])

// Step 2 — read and auto-decrypt the confidential balance
const { data: balance } = useConfidentialBalance(
  { address: WRAPPER, account: userAddress },
  { enabled: hasPermit === true },
)
// balance is a bigint — decrypted only for the permit holder.
// Nobody else can produce this value.
// formatUnits(balance, ${p.decimals}) → e.g. "100.0"`
}

// ── unwrap (two-phase finalization) ──────────────────────────────────────────

export function makeUnwrapSnippet(p: SnippetParams): string {
  return `import { parseUnits } from 'viem'
import { useUnshield } from '@zama-fhe/react-sdk'

// Two on-chain phases — the SDK manages both automatically.
// Phase 1: FHE-encrypt the amount → submit unwrap() on-chain
// Phase 2: await Zama FHE network proof → submit finalizeUnwrap()

const { mutate: unshield } = useUnshield(
  '${p.wrapperAddress}', // ${p.symbol}
)

unshield({
  amount: parseUnits('100', ${p.decimals}),
  onUnwrapSubmitted:   (txHash) => console.log('Phase 1 tx:', txHash),
  onFinalizing:        ()       => console.log('Waiting for FHE proof…'),
  onFinalizeSubmitted: (txHash) => console.log('Phase 2 tx:', txHash),
})
// When onFinalizeSubmitted fires, your ${p.underlyingSymbol} is back
// in your ERC-20 balance at ${p.underlyingAddress}`
}
