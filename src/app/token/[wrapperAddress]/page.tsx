'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { isAddress, formatUnits, parseUnits, type Hex } from 'viem'
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import {
  useHasPermit,
  useGrantPermit,
  useConfidentialBalance,
  useRevokePermits,
  useApproveUnderlying,
  useShield,
  useUnshield,
  useResumeUnshield,
} from '@zama-fhe/react-sdk'
import {
  SigningRejectedError,
  NoCiphertextError,
  TransactionRevertedError,
  EncryptionFailedError,
  TransportKeyPairExpiredError,
} from '@zama-fhe/sdk'
import { registryAbi } from '@/abis/registry'
import { mockErc20Abi } from '@/abis/mockErc20'
import { WRAPPERS_REGISTRY, SEPOLIA_CHAIN_ID, getKnownWrapper } from '@/config/zamaSepolia'
import { CodeBlock } from '@/components/CodeBlock'
import { makeConfigSnippet, makeWrapSnippet, makeDecryptSnippet, makeUnwrapSnippet } from '@/lib/devSnippets'
import { classifyPairs, type RawRegistryPair, type ClassifiedPair } from '@/lib/registryIntelligence'

// ── minimal ABI for ERC-20 metadata reads ────────────────────────────────────

const erc20MetaAbi = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
] as const

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const

// ── error helpers ─────────────────────────────────────────────────────────────

function isUserRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as Record<string, unknown>
  if (e.name === 'UserRejectedRequestError') return true
  if (error instanceof SigningRejectedError) return true
  if (e.code === 4001) return true
  const cause = e.cause
  if (cause && typeof cause === 'object') {
    const c = cause as Record<string, unknown>
    if (c.code === 4001 || c.name === 'UserRejectedRequestError') return true
  }
  return false
}

function classifyErrorMsg(error: Error): { title: string; hint: string } {
  if (error instanceof NoCiphertextError)
    return { title: 'No confidential balance', hint: 'Wrap some tokens first to populate the ciphertext.' }
  if (error instanceof TransportKeyPairExpiredError)
    return { title: 'Session key expired', hint: 'The EIP-712 permit expired (30-day TTL). Revoke and re-grant.' }
  if (error instanceof TransactionRevertedError)
    return { title: 'Transaction reverted on-chain', hint: 'Check Etherscan for the revert reason.' }
  if (error instanceof EncryptionFailedError)
    return { title: 'FHE encryption failed', hint: 'Check your connection and try again.' }
  const msg = error.message ?? ''
  if (msg.includes('insufficient funds'))
    return { title: 'Insufficient ETH for gas', hint: 'Get Sepolia ETH from a faucet.' }
  return {
    title: msg.length > 120 ? msg.slice(0, 120) + '…' : (msg || 'Unexpected error'),
    hint: error.constructor?.name && error.constructor.name !== 'Error' ? error.constructor.name : '',
  }
}

// ── shared UI primitives ──────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="rounded px-1 py-0.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-700 hover:text-zinc-300"
      title="Copy"
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function AddrChip({ addr, label }: { addr: string; label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="w-24 shrink-0 text-xs text-zinc-600">{label}</span>}
      <code className="font-mono text-xs text-zinc-400" title={addr}>
        {addr.slice(0, 6)}…{addr.slice(-4)}
      </code>
      <CopyBtn text={addr} />
      <a
        href={`https://sepolia.etherscan.io/address/${addr}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-zinc-600 hover:text-cipher-400"
        title="View on Etherscan"
      >
        ↗
      </a>
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-zinc-500" />
      {label}
    </p>
  )
}

function TxLink({ hash }: { hash: Hex }) {
  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-0.5 block truncate font-mono text-xs text-cipher-400 underline underline-offset-2 hover:text-cipher-300"
    >
      {hash}
    </a>
  )
}

function TxSuccess({ label, hash }: { label: string; hash: Hex }) {
  return (
    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3">
      <p className="text-sm font-semibold text-emerald-400">{label}</p>
      <TxLink hash={hash} />
    </div>
  )
}

function Btn({
  onClick, disabled, variant = 'primary', children,
}: {
  onClick: () => void; disabled: boolean; variant?: 'primary' | 'ghost'; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={variant === 'ghost'
        ? 'rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40'
        : 'rounded-lg border border-cipher-500 bg-cipher-500/10 px-4 py-2.5 text-sm font-semibold text-cipher-300 hover:bg-cipher-500/20 disabled:cursor-not-allowed disabled:opacity-50'
      }
    >
      {children}
    </button>
  )
}

function Panel({
  title, children, muted,
}: {
  title: string; children: React.ReactNode; muted?: boolean
}) {
  return (
    <div className={`rounded-xl border p-5 ${muted ? 'border-zinc-800/50 bg-zinc-900/20 opacity-60' : 'border-zinc-800 bg-zinc-900/60'}`}>
      <p className="mb-4 text-xs font-semibold text-zinc-500">{title}</p>
      {children}
    </div>
  )
}

// ActionError — calm handling: rejection → quiet pill, failure → amber card + details
function ActionError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const [open, setOpen] = useState(false)
  if (isUserRejection(error)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2.5">
        <p className="text-sm text-zinc-400">Transaction cancelled — you can retry when ready.</p>
        {onRetry && (
          <button onClick={onRetry} className="shrink-0 text-xs font-medium text-cipher-400 hover:text-cipher-300">
            Retry
          </button>
        )}
      </div>
    )
  }
  const { title, hint } = classifyErrorMsg(error)
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-3">
      <p className="text-sm font-medium text-amber-400">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <button onClick={() => setOpen(!open)} className="mt-1.5 text-xs text-zinc-600 hover:text-zinc-400">
        {open ? 'Hide details ▲' : 'Details ▼'}
      </button>
      {open && (
        <pre className="mt-2 max-h-24 overflow-auto rounded bg-zinc-950 p-2 font-mono text-xs leading-relaxed text-zinc-500 whitespace-pre-wrap break-all">
          {error.message}
        </pre>
      )}
    </div>
  )
}

// ── page component ────────────────────────────────────────────────────────────

export default function TokenDetailPage() {
  const params = useParams()
  const rawParam = params.wrapperAddress as string

  const isValidAddr = isAddress(rawParam)
  const wrapperAddress: `0x${string}` = isValidAddr ? (rawParam as `0x${string}`) : ZERO_ADDR

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const onSepolia = chainId === SEPOLIA_CHAIN_ID

  const knownMeta = getKnownWrapper(wrapperAddress)

  // ── state for action inputs ───────────────────────────────────────────────
  const [mintAmountStr, setMintAmountStr] = useState('10000')
  const [wrapAmountStr, setWrapAmountStr] = useState('100')
  const [unwrapAmountStr, setUnwrapAmountStr] = useState('100')
  const [shieldSubmittedHash, setShieldSubmittedHash] = useState<Hex | null>(null)
  const [unshieldPhase1Hash, setUnshieldPhase1Hash] = useState<Hex | null>(null)
  const [unshieldFinalizing, setUnshieldFinalizing] = useState(false)
  const [unshieldPhase2Hash, setUnshieldPhase2Hash] = useState<Hex | null>(null)
  const [resumeHashInput, setResumeHashInput] = useState('')

  // ── live registry read ────────────────────────────────────────────────────
  const { data: registryPairs, isLoading: registryLoading } = useReadContract({
    address: WRAPPERS_REGISTRY,
    abi: registryAbi,
    functionName: 'getTokenConfidentialTokenPairs',
    query: { retry: 3 },
  })

  type RegistryPair = { tokenAddress: `0x${string}`; confidentialTokenAddress: `0x${string}`; isValid: boolean }
  const allRawPairs = (registryPairs as RegistryPair[] | undefined) ?? []
  const pair = allRawPairs.find(p => p.confidentialTokenAddress.toLowerCase() === wrapperAddress.toLowerCase())

  // Registry Intelligence classification for this pair
  const classified: ClassifiedPair | null = allRawPairs.length > 0
    ? (classifyPairs(allRawPairs as RawRegistryPair[]).find(p => p.wrapperAddress.toLowerCase() === wrapperAddress.toLowerCase()) ?? null)
    : null

  const isValid = pair?.isValid ?? false
  const inRegistry = pair !== undefined
  const underlyingAddress: `0x${string}` = pair?.tokenAddress ?? knownMeta?.underlying ?? ZERO_ADDR
  const hasUnderlying = underlyingAddress !== ZERO_ADDR
  const isMock = knownMeta?.faucet === 'public-mock'
  const isUnknown = !knownMeta && !registryLoading  // not in our static config

  // ── metadata reads ────────────────────────────────────────────────────────
  const { data: decimalsData } = useReadContract({
    address: wrapperAddress,
    abi: mockErc20Abi,
    functionName: 'decimals',
    query: { enabled: isValidAddr },
  })
  const { data: underlyingSymbolData } = useReadContract({
    address: underlyingAddress,
    abi: erc20MetaAbi,
    functionName: 'symbol',
    query: { enabled: isValidAddr && hasUnderlying },
  })

  const decimals = typeof decimalsData === 'number' ? decimalsData : (knownMeta?.decimals ?? 6)
  const underlyingSymbol = (underlyingSymbolData as string | undefined) ?? knownMeta?.symbol.replace(/^c/, '') ?? 'TOKEN'
  const symbol = knownMeta?.symbol ?? (classified?.displaySymbol !== '?' ? classified?.displaySymbol : undefined) ?? '?'
  const name   = knownMeta?.name ?? (classified?.displayName !== 'Unknown token' ? classified?.displayName : undefined) ?? 'Unknown token'

  // ── ERC-20 balance ────────────────────────────────────────────────────────
  const { data: underlyingBalance, refetch: refetchBalance } = useReadContract({
    address: underlyingAddress,
    abi: mockErc20Abi,
    functionName: 'balanceOf',
    args: [address ?? ZERO_ADDR],
    query: { enabled: isValidAddr && hasUnderlying && isConnected && !!address },
  })

  // ── mint ──────────────────────────────────────────────────────────────────
  const { writeContract: callMint, isPending: mintSigning, data: mintTxHash, error: mintWriteErr, reset: resetMint } = useWriteContract()
  const { isLoading: mintConfirming, isSuccess: mintDone, error: mintConfirmErr } = useWaitForTransactionReceipt({ hash: mintTxHash, query: { enabled: !!mintTxHash } })
  const mintBusy = mintSigning || mintConfirming
  const mintError = mintWriteErr ?? mintConfirmErr

  function parseMintAmount() {
    try { const n = Number(mintAmountStr); return (mintAmountStr && n > 0 && n <= 999_999) ? parseUnits(mintAmountStr, decimals) : null } catch { return null }
  }
  function handleMint() {
    const amt = parseMintAmount()
    if (!amt || !address) return
    resetMint()
    callMint({ address: underlyingAddress, abi: mockErc20Abi, functionName: 'mint', args: [address, amt] })
  }

  // ── approve ───────────────────────────────────────────────────────────────
  const { mutate: doApprove, isPending: approvePending, data: approveResult, error: approveError, reset: resetApprove } = useApproveUnderlying(wrapperAddress)
  function handleApprove() {
    try { const amt = parseUnits(wrapAmountStr, decimals); resetApprove(); doApprove({ amount: amt }) } catch {}
  }

  // ── shield (wrap) ─────────────────────────────────────────────────────────
  const { mutate: doShield, isPending: shieldPending, data: shieldResult, error: shieldError, reset: resetShield } = useShield({ address: wrapperAddress })
  function handleShield() {
    try {
      const amt = parseUnits(wrapAmountStr, decimals)
      resetShield(); setShieldSubmittedHash(null)
      doShield({ amount: amt, approvalStrategy: 'skip', onShieldSubmitted: (h) => setShieldSubmittedHash(h) })
    } catch {}
  }

  // ── permit + confidential balance ─────────────────────────────────────────
  const { data: hasPermit, isLoading: checkingPermit } = useHasPermit(
    { contractAddresses: [wrapperAddress] },
    { enabled: isValidAddr && isConnected && onSepolia },
  )
  const { mutate: grantPermit, isPending: grantingPermit, error: grantError, reset: resetGrant } = useGrantPermit()
  const { mutate: revokePermit, isPending: revokingPermit } = useRevokePermits()
  const { data: confBalance, isLoading: loadingBalance, isFetching: fetchingBalance, failureCount: balanceFails, isError: isBalanceError, error: balanceError } = useConfidentialBalance(
    { address: wrapperAddress, account: address },
    { enabled: isValidAddr && isConnected && onSepolia && hasPermit === true, retry: 3, retryDelay: (n) => Math.min(500 * 2 ** n, 8000) },
  )

  // ── unshield (unwrap) ─────────────────────────────────────────────────────
  const { mutate: doUnshield, isPending: unshieldPending, data: unshieldResult, error: unshieldError, reset: resetUnshield } = useUnshield(wrapperAddress)
  function handleUnshield() {
    try {
      const amt = parseUnits(unwrapAmountStr, decimals)
      resetUnshield(); setUnshieldPhase1Hash(null); setUnshieldFinalizing(false); setUnshieldPhase2Hash(null)
      doUnshield({ amount: amt, onUnwrapSubmitted: (h) => setUnshieldPhase1Hash(h), onFinalizing: () => setUnshieldFinalizing(true), onFinalizeSubmitted: (h) => setUnshieldPhase2Hash(h) })
    } catch {}
  }

  // ── resume unshield ───────────────────────────────────────────────────────
  const { mutate: doResume, isPending: resumePending, data: resumeResult, error: resumeError, reset: resetResume } = useResumeUnshield(wrapperAddress)
  function handleResume() {
    if (!resumeHashInput.startsWith('0x')) return
    resetResume()
    doResume({ unwrapTxHash: resumeHashInput as Hex, onFinalizing: () => setUnshieldFinalizing(true), onFinalizeSubmitted: (h) => setUnshieldPhase2Hash(h) })
  }

  // ── early exit: invalid hex ───────────────────────────────────────────────
  if (!isValidAddr) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
          <span className="text-lg">?</span>
        </div>
        <p className="text-lg font-semibold text-zinc-200">Invalid address</p>
        <p className="mt-2 font-mono text-sm text-zinc-600 break-all">{rawParam}</p>
        <p className="mt-1 text-sm text-zinc-500">This is not a valid EVM address.</p>
        <Link href="/registry" className="mt-6 inline-block rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200">
          ← Back to registry
        </Link>
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">

      {/* Back nav */}
      <Link href="/registry" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300">
        ← Registry
      </Link>

      {/* ── Identity + Classification ───────────────────────────────────────── */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        {/* Name + symbol */}
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{symbol}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">{name}</p>
          </div>

          {/* Validity badge */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {registryLoading ? (
              <span className="h-5 w-16 animate-pulse rounded bg-zinc-800" />
            ) : !inRegistry ? (
              <span className="rounded border border-amber-600/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                Not in registry
              </span>
            ) : isValid ? (
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">Valid</span>
            ) : (
              <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">Revoked</span>
            )}

            {/* Classification badges */}
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">ERC-7984</span>

            {isMock && (
              <span className="rounded bg-cipher-500/15 px-2 py-0.5 text-xs font-semibold text-cipher-400">
                Public faucet
              </span>
            )}
            {knownMeta?.faucet === 'restricted' && (
              <span className="rounded bg-zinc-700/60 px-2 py-0.5 text-xs text-zinc-400">
                Restricted mint
              </span>
            )}
            {classified?.isDuplicate && (
              <span className="rounded border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400">
                Duplicate symbol
              </span>
            )}
            {classified?.reviewFlags.includes('unknown-metadata') && (
              <span className="rounded border border-amber-600/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">
                ⚠ Unknown token
              </span>
            )}
          </div>
        </div>

        {/* Notes */}
        {knownMeta?.note && (
          <p className="mb-3 rounded-lg border border-amber-700/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-500">
            {knownMeta.note}
          </p>
        )}
        {classified?.isDuplicate && (
          <p className="mb-3 text-xs text-amber-600">
            Another wrapper resolves to the same underlying symbol ({symbol.replace(/^c/, '').replace(/Mock$/, '')}). Check both entries in the{' '}
            <Link href="/registry" className="underline underline-offset-2 hover:text-amber-400">registry</Link> before integrating.
          </p>
        )}
        {classified?.reviewFlags.includes('unknown-metadata') && (
          <p className="mb-3 text-xs text-zinc-500">
            This address appears in the live registry but is not in our verified known-wrapper list. It may be a new deployment. Verify the contract on Etherscan before using it.
          </p>
        )}
        {!inRegistry && !registryLoading && isUnknown && (
          <p className="mb-3 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-500">
            This address is not in the live registry and is not a known Zama wrapper. It may be an unverified or third-party deployment. Use with caution.
          </p>
        )}
        {!inRegistry && !registryLoading && knownMeta && (
          <p className="mb-3 text-xs text-zinc-500">
            This wrapper is in our config but was not returned by the live registry. It may have been removed or the registry may be temporarily unavailable.
          </p>
        )}
        {!isValid && inRegistry && !registryLoading && (
          <p className="mb-3 text-xs text-red-500">
            This pair is marked <strong>revoked</strong> in the registry. Wrap and unwrap are disabled.
          </p>
        )}

        {/* Addresses */}
        <div className="flex flex-col gap-2 border-t border-zinc-800 pt-4">
          <AddrChip addr={wrapperAddress} label="Wrapper" />
          {hasUnderlying ? (
            <AddrChip addr={underlyingAddress} label="Underlying" />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs text-zinc-600">Underlying</span>
              <span className="text-xs text-zinc-600">{registryLoading ? 'Loading…' : 'Unknown'}</span>
            </div>
          )}
          {decimals !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs text-zinc-600">Decimals</span>
              <span className="font-mono text-xs text-zinc-500">{decimals}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Wallet / network gates ──────────────────────────────────────────── */}
      {!isConnected && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <p className="text-sm text-zinc-400">
            Connect your wallet to see balances and enable actions.
          </p>
          <span className="shrink-0 text-xs text-zinc-600">↑ top right</span>
        </div>
      )}
      {isConnected && !onSepolia && (
        <div className="mb-5 rounded-xl border border-amber-600/30 bg-amber-500/5 px-4 py-3">
          <p className="text-sm font-semibold text-amber-400">Switch to Sepolia</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            All Zama FHE contracts are on Sepolia (chainId {SEPOLIA_CHAIN_ID}). Use the wallet to switch networks.
          </p>
        </div>
      )}

      {/* ── Action panels — connected + Sepolia ────────────────────────────── */}
      {isConnected && onSepolia && (
        <div className="flex flex-col gap-4">

          {/* ── Balances ─────────────────────────────────────────────────── */}
          <Panel title="Balances">
            <div className="flex flex-col gap-3">

              {/* ERC-20 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">
                  {underlyingSymbol}
                  <span className="ml-1.5 text-xs text-zinc-600">ERC-20</span>
                </span>
                <div className="flex items-center gap-2">
                  {underlyingBalance !== undefined ? (
                    <span className="font-mono text-sm font-semibold text-zinc-200">
                      {formatUnits(underlyingBalance as bigint, decimals)}{' '}
                      <span className="text-xs font-normal text-zinc-500">{underlyingSymbol}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-zinc-600">—</span>
                  )}
                  <button onClick={() => void refetchBalance()} className="text-xs text-zinc-600 hover:text-zinc-400" title="Refresh">↺</button>
                </div>
              </div>

              <div className="border-t border-zinc-800/60" />

              {/* Confidential */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    {symbol}
                    <span className="ml-1.5 text-xs text-zinc-600">Confidential</span>
                  </span>
                  {hasPermit && (
                    <button
                      onClick={() => revokePermit([wrapperAddress])}
                      disabled={revokingPermit}
                      className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400 disabled:opacity-50"
                    >
                      {revokingPermit ? 'Revoking…' : 'Revoke permit'}
                    </button>
                  )}
                </div>

                {checkingPermit ? (
                  <Spinner label="Checking permit…" />
                ) : !hasPermit ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-zinc-500">
                      Grant a free EIP-712 permit (no gas) to decrypt your balance.
                    </p>
                    {grantError && (
                      <ActionError
                        error={grantError}
                        onRetry={() => { resetGrant(); grantPermit([wrapperAddress]) }}
                      />
                    )}
                    <Btn onClick={() => { resetGrant(); grantPermit([wrapperAddress]) }} disabled={grantingPermit}>
                      {grantingPermit ? '⏳ Awaiting signature…' : grantError ? 'Retry — Grant Permit' : 'Grant Permit (EIP-712, free)'}
                    </Btn>
                  </div>
                ) : confBalance !== undefined ? (
                  <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3">
                    <p className="text-xs text-emerald-600">Decrypted confidential balance</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">
                      {formatUnits(confBalance as bigint, decimals)}{' '}
                      <span className="text-sm font-normal text-emerald-600">{symbol}</span>
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Raw bigint: {(confBalance as bigint).toString()}
                    </p>
                  </div>
                ) : isBalanceError && balanceError ? (
                  <ActionError error={balanceError} />
                ) : balanceFails > 0 && fetchingBalance ? (
                  <Spinner label={`RPC hiccup — retrying… (attempt ${balanceFails + 1} of 4)`} />
                ) : loadingBalance ? (
                  <div className="flex flex-col gap-1.5">
                    <Spinner label="Reading ciphertext handle…" />
                    <Spinner label="Decrypting via Zama relayer…" />
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>

          {/* ── Faucet ───────────────────────────────────────────────────── */}
          {isMock && (
            <Panel title="Faucet">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-400">
                  Mints test <span className="text-zinc-200">{underlyingSymbol}</span> directly to your address.
                  Capped at 999,999 per call.
                </p>
                <div className="flex items-center gap-2">
                  <label className="w-24 shrink-0 text-xs text-zinc-500">Amount</label>
                  <input
                    type="number" min="1" max="999999"
                    value={mintAmountStr}
                    onChange={(e) => setMintAmountStr(e.target.value)}
                    disabled={mintBusy || mintDone}
                    className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 focus:border-cipher-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-xs text-zinc-500">{underlyingSymbol}</span>
                </div>
                {mintError && (
                  <ActionError
                    error={mintError as Error}
                    onRetry={() => { resetMint(); handleMint() }}
                  />
                )}
                {mintSigning && <Spinner label="Awaiting wallet signature…" />}
                {mintConfirming && mintTxHash && (
                  <div className="flex flex-col gap-1"><Spinner label="Mining…" /><TxLink hash={mintTxHash} /></div>
                )}
                {mintDone && mintTxHash && <TxSuccess label="Mint confirmed" hash={mintTxHash} />}
                <div className="flex items-center gap-3">
                  {!mintDone ? (
                    <Btn onClick={handleMint} disabled={mintBusy || !parseMintAmount() || !hasUnderlying}>
                      {mintSigning ? '⏳ Signing…' : mintConfirming ? '⛏ Mining…' : `Mint ${mintAmountStr} ${underlyingSymbol}`}
                    </Btn>
                  ) : (
                    <button onClick={() => { resetMint(); void refetchBalance() }} className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400">
                      Mint again
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {/* ── Revoked notice ────────────────────────────────────────────── */}
          {!isValid && inRegistry && (
            <Panel title="Wrap / Unwrap" muted>
              <p className="text-sm text-zinc-500">Disabled — this pair is revoked in the registry.</p>
            </Panel>
          )}

          {/* ── Wrap (approve + shield) ───────────────────────────────────── */}
          {isValid && (
            <Panel title="Wrap">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-400">
                  Approve the wrapper to pull <span className="text-zinc-200">{underlyingSymbol}</span>, then encrypt and wrap into a confidential balance.
                </p>
                <div className="flex items-center gap-2">
                  <label className="w-24 shrink-0 text-xs text-zinc-500">Amount</label>
                  <input
                    type="number" min="1" value={wrapAmountStr}
                    onChange={(e) => setWrapAmountStr(e.target.value)}
                    disabled={shieldPending}
                    className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 focus:border-cipher-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-xs text-zinc-500">{underlyingSymbol}</span>
                </div>

                {/* Step 1: Approve */}
                <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-xs font-semibold text-zinc-500">Step 1 — Approve</p>
                  {approveError && (
                    <ActionError error={approveError} onRetry={() => { resetApprove(); handleApprove() }} />
                  )}
                  {approvePending && <Spinner label="Awaiting signature + mining…" />}
                  {approveResult && !approvePending && <TxSuccess label="Approved" hash={approveResult.txHash} />}
                  <Btn onClick={handleApprove} disabled={approvePending}>
                    {approvePending ? '⏳ Approving…' : approveResult ? `Re-approve ${wrapAmountStr} ${underlyingSymbol}` : `Approve ${wrapAmountStr} ${underlyingSymbol}`}
                  </Btn>
                </div>

                {/* Step 2: Shield */}
                <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-xs font-semibold text-zinc-500">Step 2 — Shield (wrap)</p>
                  {shieldError && (
                    <ActionError error={shieldError} onRetry={() => { resetShield(); setShieldSubmittedHash(null); handleShield() }} />
                  )}
                  {shieldPending && !shieldSubmittedHash && <Spinner label="FHE-encrypting + awaiting signature…" />}
                  {shieldPending && shieldSubmittedHash && (
                    <div className="flex flex-col gap-1"><Spinner label="Mining wrap transaction…" /><TxLink hash={shieldSubmittedHash} /></div>
                  )}
                  {shieldResult && !shieldPending && <TxSuccess label="Wrapped — tokens are now confidential" hash={shieldResult.txHash} />}
                  <div className="flex items-center gap-3">
                    <Btn onClick={handleShield} disabled={shieldPending}>
                      {shieldPending
                        ? shieldSubmittedHash ? '⛏ Mining…' : '⏳ Encrypting + signing…'
                        : `Wrap ${wrapAmountStr} ${underlyingSymbol} → ${symbol}`}
                    </Btn>
                    {shieldResult && (
                      <button onClick={() => { resetShield(); setShieldSubmittedHash(null) }} className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400">
                        Wrap again
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* ── Unwrap (two-phase unshield) ───────────────────────────────── */}
          {isValid && (
            <Panel title="Unwrap">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-zinc-400">
                  Two on-chain phases: <span className="text-zinc-300">Phase 1</span> encrypts and submits{' '}
                  <code className="rounded bg-zinc-800 px-1 text-xs">unwrap()</code>.{' '}
                  <span className="text-zinc-300">Phase 2</span> awaits the Zama FHE network proof, then submits{' '}
                  <code className="rounded bg-zinc-800 px-1 text-xs">finalizeUnwrap()</code>{' '}
                  automatically. You sign once; the SDK handles phase 2.
                </p>

                <div className="flex items-center gap-2">
                  <label className="w-24 shrink-0 text-xs text-zinc-500">Amount</label>
                  <input
                    type="number" min="1" value={unwrapAmountStr}
                    onChange={(e) => setUnwrapAmountStr(e.target.value)}
                    disabled={unshieldPending}
                    className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 focus:border-cipher-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-xs text-zinc-500">{symbol}</span>
                </div>

                {unshieldError && (
                  <ActionError
                    error={unshieldError}
                    onRetry={() => { resetUnshield(); setUnshieldPhase1Hash(null); setUnshieldFinalizing(false); setUnshieldPhase2Hash(null); handleUnshield() }}
                  />
                )}

                {/* Phase progress tracker */}
                {(unshieldPending || unshieldPhase1Hash) && !unshieldResult && (
                  <div className="flex flex-col gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${unshieldPhase1Hash ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>1</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-zinc-400">Unwrap submitted</p>
                        {!unshieldPhase1Hash && <Spinner label="FHE-encrypting + awaiting signature…" />}
                        {unshieldPhase1Hash && <TxLink hash={unshieldPhase1Hash} />}
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${unshieldPhase2Hash ? 'bg-emerald-500 text-black' : unshieldFinalizing ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-zinc-300'}`}>2</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-zinc-400">Finalize unwrap</p>
                        {unshieldPhase1Hash && !unshieldFinalizing && !unshieldPhase2Hash && (
                          <Spinner label="Waiting for Zama FHE network decryption proof…" />
                        )}
                        {unshieldFinalizing && !unshieldPhase2Hash && <Spinner label="Proof received — submitting finalizeUnwrap…" />}
                        {unshieldPhase2Hash && <TxLink hash={unshieldPhase2Hash} />}
                      </div>
                    </div>
                  </div>
                )}

                {unshieldResult && !unshieldPending && (
                  <TxSuccess label="Unwrap complete — tokens returned to your ERC-20 balance" hash={unshieldResult.txHash} />
                )}

                <div className="flex items-center gap-3">
                  {!unshieldResult ? (
                    <Btn onClick={handleUnshield} disabled={unshieldPending}>
                      {unshieldPending
                        ? unshieldPhase2Hash ? '⛏ Finalizing…' : unshieldFinalizing ? '⏳ Submitting finalize…' : unshieldPhase1Hash ? '⟳ Awaiting FHE proof…' : '⏳ Encrypting + signing…'
                        : `Unwrap ${unwrapAmountStr} ${symbol}`}
                    </Btn>
                  ) : (
                    <button
                      onClick={() => { resetUnshield(); setUnshieldPhase1Hash(null); setUnshieldFinalizing(false); setUnshieldPhase2Hash(null); void refetchBalance() }}
                      className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
                    >
                      Unwrap again
                    </button>
                  )}
                </div>

                {/* Resume interrupted unwrap */}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400">
                    Resume interrupted unwrap
                  </summary>
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                    <p className="text-xs text-zinc-500">
                      If you submitted an <code className="rounded bg-zinc-800 px-1">unwrap</code> in a previous session but finalization never completed, paste the phase-1 tx hash to resume from phase 2.
                    </p>
                    <input
                      type="text" placeholder="0x… (unwrap tx hash)"
                      value={resumeHashInput}
                      onChange={(e) => setResumeHashInput(e.target.value)}
                      disabled={resumePending}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:border-cipher-500 focus:outline-none disabled:opacity-50"
                    />
                    {resumeError && <ActionError error={resumeError} />}
                    {resumeResult && !resumePending && <TxSuccess label="Resume complete" hash={resumeResult.txHash} />}
                    <Btn onClick={handleResume} disabled={resumePending || !resumeHashInput.startsWith('0x')} variant="ghost">
                      {resumePending ? '⏳ Finalizing…' : 'Resume finalize'}
                    </Btn>
                  </div>
                </details>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* ── Developer snippets — always visible ──────────────────────────────── */}
      <div className="mt-6">
        <TokenDevSection
          wrapperAddress={wrapperAddress}
          underlyingAddress={underlyingAddress}
          hasUnderlying={hasUnderlying}
          registryLoading={registryLoading}
          symbol={symbol}
          underlyingSymbol={underlyingSymbol}
          decimals={decimals}
          name={name}
        />
      </div>

    </div>
  )
}

// ── Developer section (collapsible) ──────────────────────────────────────────

function TokenDevSection({
  wrapperAddress, underlyingAddress, hasUnderlying, registryLoading,
  symbol, underlyingSymbol, decimals, name,
}: {
  wrapperAddress: string; underlyingAddress: string; hasUnderlying: boolean
  registryLoading: boolean; symbol: string; underlyingSymbol: string
  decimals: number; name: string
}) {
  const [open, setOpen] = useState(false)

  const snippets = hasUnderlying ? (() => {
    const p = { wrapperAddress, underlyingAddress, symbol, underlyingSymbol, decimals, chainId: SEPOLIA_CHAIN_ID, registry: WRAPPERS_REGISTRY, name }
    return { config: makeConfigSnippet(p), wrap: makeWrapSnippet(p), decrypt: makeDecryptSnippet(p), unwrap: makeUnwrapSnippet(p) }
  })() : null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-500">Developer</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-600">{symbol}</span>
        </div>
        <span className="text-xs text-zinc-600">{open ? 'Collapse ▲' : 'Expand snippets ▼'}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-zinc-800 px-5 pb-5 pt-4">
          <p className="text-sm text-zinc-500">
            Generated from live registry data — addresses are real Sepolia values.{' '}
            <Link href="/developers" className="text-cipher-400 underline underline-offset-2 hover:text-cipher-300">
              Full Developer Kit →
            </Link>
          </p>

          {registryLoading && !hasUnderlying && <Spinner label="Loading pair data…" />}

          {snippets && (
            <>
              {[
                { title: 'Config object', code: snippets.config, label: 'TypeScript' },
                { title: 'Approve + Wrap', code: snippets.wrap, label: 'TypeScript · @zama-fhe/react-sdk' },
                { title: 'Decrypt confidential balance', code: snippets.decrypt, label: 'TypeScript · @zama-fhe/react-sdk' },
                { title: 'Unwrap (two-phase)', code: snippets.unwrap, label: 'TypeScript · @zama-fhe/react-sdk' },
              ].map((s) => (
                <div key={s.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">{s.title}</p>
                  <CodeBlock code={s.code} label={s.label} />
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
