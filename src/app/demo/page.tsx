'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { formatUnits, parseUnits } from 'viem'
import type { Hex } from 'viem'
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi'
import {
  useHasPermit,
  useGrantPermit,
  useConfidentialBalance,
  useRevokePermits,
  useApproveUnderlying,
  useShield,
  useUnshield,
} from '@zama-fhe/react-sdk'
import {
  SigningRejectedError,
  NoCiphertextError,
  TransactionRevertedError,
  EncryptionFailedError,
} from '@zama-fhe/sdk'
import { registryAbi } from '@/abis/registry'
import { mockErc20Abi } from '@/abis/mockErc20'
import { WRAPPERS_REGISTRY, SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'
import { classifyPairs, type RawRegistryPair } from '@/lib/registryIntelligence'

// ── demo constants ────────────────────────────────────────────────────────────

const DEMO_WRAPPER    = '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639' as const
const DEMO_UNDERLYING = '0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF' as const
const DEMO_DECIMALS   = 6
const DEMO_SYMBOL     = 'cUSDCMock'
const ZERO            = '0x0000000000000000000000000000000000000000' as const

// ── step types ────────────────────────────────────────────────────────────────

type StepStatus = 'locked' | 'active' | 'pending' | 'completed' | 'failed'

// ── error handling ────────────────────────────────────────────────────────────

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

function classifyError(error: Error): { title: string; hint: string } {
  if (error instanceof NoCiphertextError)
    return { title: 'No confidential balance found', hint: 'Complete the wrap step first, then decrypt.' }
  if (error instanceof TransactionRevertedError)
    return { title: 'Transaction reverted on-chain', hint: 'The contract rejected the call. View Etherscan for the revert reason.' }
  if (error instanceof EncryptionFailedError)
    return { title: 'FHE encryption failed', hint: 'Check your connection and try again.' }
  const msg = error.message ?? ''
  if (msg.includes('insufficient funds'))
    return { title: 'Insufficient ETH for gas', hint: 'Get Sepolia ETH from a faucet.' }
  if (msg.includes('nonce'))
    return { title: 'Nonce mismatch', hint: 'Refresh the page and try again.' }
  return {
    title: msg.length > 100 ? msg.slice(0, 100) + '…' : (msg || 'Unexpected error'),
    hint: error.constructor?.name && error.constructor.name !== 'Error' ? error.constructor.name : '',
  }
}

function StepError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const [open, setOpen] = useState(false)

  if (isUserRejection(error)) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2.5">
        <p className="text-sm text-zinc-400">
          Transaction cancelled — you can retry when ready.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 text-xs font-medium text-cipher-400 hover:text-cipher-300"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const { title, hint } = classifyError(error)
  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-3">
      <p className="text-sm font-medium text-amber-400">{title}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <button
        onClick={() => setOpen(!open)}
        className="mt-1.5 text-xs text-zinc-600 hover:text-zinc-400"
      >
        {open ? 'Hide details ▲' : 'Details ▼'}
      </button>
      {open && (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-zinc-950 p-2 font-mono text-xs leading-relaxed text-zinc-500 whitespace-pre-wrap break-all">
          {error.message}
        </pre>
      )}
    </div>
  )
}

// ── shared UI atoms ───────────────────────────────────────────────────────────

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

// Primary CTA — full-width, gold, unmissable
function PrimaryBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-gold w-full rounded-xl px-5 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function RedoBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
    >
      Redo
    </button>
  )
}

// ── step card ─────────────────────────────────────────────────────────────────

function StepCard({
  number,
  title,
  tagline,
  status,
  onRedo,
  isCancelled,
  children,
  stepRef,
}: {
  number: number
  title: string
  tagline: string
  status: StepStatus
  onRedo?: () => void
  isCancelled?: boolean
  children?: React.ReactNode
  stepRef?: React.RefCallback<HTMLDivElement>
}) {
  // Completed: compact single-line row, no body
  if (status === 'completed') {
    return (
      <div
        ref={stepRef}
        className="flex items-center gap-3 rounded-xl border border-space-700/25 bg-space-800/10 px-4 py-2.5"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-black">
          ✓
        </div>
        <span className="flex-1 text-sm text-zinc-500">{title}</span>
        {onRedo && <RedoBtn onClick={onRedo} />}
      </div>
    )
  }

  // Locked: nearly invisible, no body
  if (status === 'locked') {
    return (
      <div
        ref={stepRef}
        className="flex items-center gap-3 rounded-xl border border-space-800/40 px-4 py-2.5 opacity-25 select-none"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-space-700 text-xs font-bold text-slate-600">
          {number}
        </div>
        <span className="text-sm text-slate-600">{title}</span>
      </div>
    )
  }

  // Active / pending / failed: full spotlighted card
  const cardCls: Record<StepStatus, string> = {
    locked:    '',
    active:    'border-cipher-600/50 bg-space-800/80 backdrop-blur-sm shadow-[0_0_24px_rgba(20,184,166,0.06)]',
    pending:   'border-amber-700/30 bg-amber-950/5 backdrop-blur-sm',
    completed: '',
    failed:    isCancelled ? 'border-space-700/40 bg-space-800/40 backdrop-blur-sm' : 'border-space-700/40 bg-space-800/50 backdrop-blur-sm',
  }
  const badgeEl = isCancelled ? (
    <span className="rounded bg-zinc-700/40 px-2 py-0.5 text-xs font-medium text-zinc-500">
      Cancelled
    </span>
  ) : status === 'failed' ? (
    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
      Failed
    </span>
  ) : status === 'pending' ? (
    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
      In progress
    </span>
  ) : null

  return (
    <div
      ref={stepRef}
      className={`scroll-mt-20 rounded-xl border p-5 transition-all ${cardCls[status]}`}
    >
      <div className="flex items-start gap-3">
        {/* Status circle */}
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            status === 'active'
              ? 'bg-cipher-500/20 text-cipher-300 ring-1 ring-cipher-500/50'
              : status === 'pending'
                ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                : 'bg-red-500/20 text-red-400'
          }`}
        >
          {number}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
            {badgeEl}
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{tagline}</p>
          {children && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  )
}

// ── progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="mb-6 rounded-xl border border-blue-900/25 bg-space-800/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-slate-100">Judge Demo Mode</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            cUSDCMock · Sepolia testnet · end-to-end confidential token flow
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            <span className="text-cipher-300">{completed}</span>
            <span className="text-zinc-600"> / {total}</span>
          </p>
          <p className="text-xs text-zinc-600">complete</p>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-space-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cipher-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {completed === total && completed > 0 && (
        <p className="mt-2 text-center text-xs font-medium text-emerald-400">
          All steps complete — the full confidential token flow is verified ✓
        </p>
      )}
    </div>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const stepRefs = useRef<(HTMLDivElement | null)[]>(Array(9).fill(null))

  // ── wallet / network ──────────────────────────────────────────────────────
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const onSepolia = chainId === SEPOLIA_CHAIN_ID
  const { switchChain, isPending: switchPending } = useSwitchChain()

  // ── registry read ─────────────────────────────────────────────────────────
  const {
    data: registryData,
    isLoading: registryLoading,
    isError: registryError,
    refetch: refetchRegistry,
  } = useReadContract({
    address: WRAPPERS_REGISTRY,
    abi: registryAbi,
    functionName: 'getTokenConfidentialTokenPairs',
    query: { enabled: onSepolia, retry: 3 },
  })

  const rawPairs = (registryData as RawRegistryPair[] | undefined) ?? []
  const classified = classifyPairs(rawPairs)
  const validCount = classified.filter((p) => p.isValid).length

  // ── underlying ERC-20 balance ─────────────────────────────────────────────
  const { data: underlyingBalance, refetch: refetchBalance } = useReadContract({
    address: DEMO_UNDERLYING,
    abi: mockErc20Abi,
    functionName: 'balanceOf',
    args: [address ?? ZERO],
    query: { enabled: isConnected && onSepolia && !!address },
  })

  // ── step 4: faucet mint ───────────────────────────────────────────────────
  const {
    writeContract: callMint,
    isPending: mintAwaitingSig,
    data: mintTxHash,
    error: mintWriteError,
    reset: resetMint,
  } = useWriteContract()

  const {
    isLoading: mintConfirming,
    isSuccess: mintDone,
    error: mintConfirmError,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash,
    query: { enabled: !!mintTxHash },
  })

  const mintBusy  = mintAwaitingSig || mintConfirming
  const mintError = mintWriteError ?? mintConfirmError

  // ── step 5: approve ───────────────────────────────────────────────────────
  const {
    mutate: doApprove,
    isPending: approvePending,
    data: approveResult,
    error: approveError,
    reset: resetApprove,
  } = useApproveUnderlying(DEMO_WRAPPER)

  // ── step 6: wrap (shield) ─────────────────────────────────────────────────
  const [shieldSubmittedHash, setShieldSubmittedHash] = useState<Hex | null>(null)

  const {
    mutate: doShield,
    isPending: shieldPending,
    data: shieldResult,
    error: shieldError,
    reset: resetShield,
  } = useShield({ address: DEMO_WRAPPER })

  // ── step 7: decrypt ───────────────────────────────────────────────────────
  const { data: hasPermit, isLoading: checkingPermit } = useHasPermit(
    { contractAddresses: [DEMO_WRAPPER] },
    { enabled: isConnected && onSepolia },
  )

  const {
    mutate: grantPermit,
    isPending: grantingPermit,
    error: grantError,
    reset: resetGrant,
  } = useGrantPermit()

  const { mutate: revokePermit, isPending: revokingPermit } = useRevokePermits()

  const {
    data: confBalance,
    isLoading: loadingBalance,
    isFetching: fetchingBalance,
    failureCount: balanceFailures,
    isError: isBalanceError,
    error: balanceError,
  } = useConfidentialBalance(
    { address: DEMO_WRAPPER, account: address },
    {
      enabled: isConnected && onSepolia && hasPermit === true,
      retry: 3,
      retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 8000),
    },
  )

  // ── step 8: unwrap (two-phase) ────────────────────────────────────────────
  const [unshieldPhase1Hash, setUnshieldPhase1Hash] = useState<Hex | null>(null)
  const [unshieldFinalizing, setUnshieldFinalizing] = useState(false)
  const [unshieldPhase2Hash, setUnshieldPhase2Hash] = useState<Hex | null>(null)

  const {
    mutate: doUnshield,
    isPending: unshieldPending,
    data: unshieldResult,
    error: unshieldError,
    reset: resetUnshield,
  } = useUnshield(DEMO_WRAPPER)

  // ── step completion ───────────────────────────────────────────────────────
  const step1Done = isConnected
  const step2Done = isConnected && onSepolia
  const step3Done = step2Done && !registryLoading && !registryError && classified.length > 0
  const step4Done = mintDone
  const step5Done = !!approveResult
  const step6Done = !!shieldResult
  const step7Done = hasPermit === true && confBalance !== undefined
  const step8Done = !!unshieldResult

  const completedCount = [
    step1Done, step2Done, step3Done, step4Done,
    step5Done, step6Done, step7Done, step8Done,
  ].filter(Boolean).length

  // ── step statuses ─────────────────────────────────────────────────────────
  function deriveStatus(done: boolean, unlocked: boolean, busy: boolean, failed: boolean): StepStatus {
    if (done)     return 'completed'
    if (!unlocked) return 'locked'
    if (busy)     return 'pending'
    if (failed)   return 'failed'
    return 'active'
  }

  const s1: StepStatus = step1Done ? 'completed' : 'active'
  const s2: StepStatus = step2Done ? 'completed' : step1Done ? (switchPending ? 'pending' : 'active') : 'locked'
  const s3: StepStatus = step3Done
    ? 'completed'
    : step2Done
      ? registryLoading ? 'pending' : registryError ? 'failed' : 'active'
      : 'locked'
  const s4 = deriveStatus(step4Done, step3Done, mintBusy, !!mintError)
  const s5 = deriveStatus(step5Done, step4Done, approvePending, !!approveError)
  const s6 = deriveStatus(step6Done, step5Done, shieldPending, !!shieldError)
  const s7 = deriveStatus(
    step7Done,
    step6Done,
    grantingPermit || (hasPermit === true && (loadingBalance || (balanceFailures > 0 && fetchingBalance))),
    hasPermit === true ? (isBalanceError && !fetchingBalance) : !!grantError,
  )
  const s8 = deriveStatus(step8Done, step7Done, unshieldPending, !!unshieldError)

  const statuses = [s1, s2, s3, s4, s5, s6, s7, s8]

  // ── auto-scroll to newly active step ─────────────────────────────────────
  const activeIdx = statuses.findIndex((s) => s === 'active' || s === 'pending' || s === 'failed')
  const prevCompletedRef = useRef(completedCount)

  useEffect(() => {
    // Only scroll after at least one step completes (don't scroll on initial load)
    if (completedCount > 0 && completedCount !== prevCompletedRef.current && activeIdx >= 0) {
      const el = stepRefs.current[activeIdx]
      if (el) {
        // Small delay so the DOM has updated before scrolling
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      }
    }
    prevCompletedRef.current = completedCount
  }, [completedCount, activeIdx])

  // ── handlers ──────────────────────────────────────────────────────────────
  function handleMint() {
    if (!address) return
    resetMint()
    callMint({
      address: DEMO_UNDERLYING,
      abi: mockErc20Abi,
      functionName: 'mint',
      args: [address, parseUnits('1000', DEMO_DECIMALS)],
    })
  }

  function handleApprove() {
    resetApprove()
    doApprove({ amount: parseUnits('100', DEMO_DECIMALS) })
  }

  function handleShield() {
    resetShield()
    setShieldSubmittedHash(null)
    doShield({
      amount: parseUnits('100', DEMO_DECIMALS),
      approvalStrategy: 'skip',
      onShieldSubmitted: (hash) => setShieldSubmittedHash(hash),
    })
  }

  function handleUnshield() {
    resetUnshield()
    setUnshieldPhase1Hash(null)
    setUnshieldFinalizing(false)
    setUnshieldPhase2Hash(null)
    doUnshield({
      amount: parseUnits('100', DEMO_DECIMALS),
      onUnwrapSubmitted: (hash) => setUnshieldPhase1Hash(hash),
      onFinalizing: () => setUnshieldFinalizing(true),
      onFinalizeSubmitted: (hash) => setUnshieldPhase2Hash(hash),
    })
  }

  // ref setter factory so we avoid inline functions changing every render
  function setRef(i: number): React.RefCallback<HTMLDivElement> {
    return (el) => { stepRefs.current[i] = el }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ProgressBar completed={completedCount} total={8} />

      <div className="flex flex-col gap-2">

        {/* ── Step 1: Connect wallet ────────────────────────────────────── */}
        <StepCard
          number={1}
          title="Connect wallet"
          tagline="MetaMask or any injected wallet. Your private key never leaves your device."
          status={s1}
          stepRef={setRef(0)}
        >
          <div className="rounded-lg border border-space-700/30 bg-space-950/70 px-4 py-3">
            <p className="text-sm text-zinc-400">
              Click{' '}
              <span className="font-semibold text-zinc-200">Connect Wallet</span>{' '}
              in the top-right corner of the page.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              CipherWrap is read-only until you sign — no gas spent just for connecting.
            </p>
          </div>
        </StepCard>

        {/* ── Step 2: Sepolia ───────────────────────────────────────────── */}
        <StepCard
          number={2}
          title="Switch to Sepolia"
          tagline="All Zama FHE contracts live on Sepolia (chainId 11155111). No mainnet risk."
          status={s2}
          stepRef={setRef(1)}
        >
          {s2 === 'active' && (
            <PrimaryBtn
              onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
              disabled={switchPending}
            >
              {switchPending ? '⏳ Switching…' : 'Switch to Sepolia'}
            </PrimaryBtn>
          )}
          {s2 === 'pending' && <Spinner label="Switching network…" />}
        </StepCard>

        {/* ── Step 3: Registry loaded ───────────────────────────────────── */}
        <StepCard
          number={3}
          title="Registry loaded"
          tagline="Reads getTokenConfidentialTokenPairs() live from the registry contract — not a static list."
          status={s3}
          stepRef={setRef(2)}
        >
          {s3 === 'pending' && <Spinner label="Reading registry on-chain…" />}
          {s3 === 'failed' && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-400">Registry read failed. Check RPC connectivity.</p>
              <PrimaryBtn onClick={() => void refetchRegistry()} disabled={false}>
                Retry registry read
              </PrimaryBtn>
            </div>
          )}
          {s3 === 'active' && (
            <Spinner label="Waiting for registry response…" />
          )}
        </StepCard>

        {/* ── Step 4: Faucet mint ───────────────────────────────────────── */}
        <StepCard
          number={4}
          title="Faucet — mint 1,000 USDCMock"
          tagline="Public mint on the mock ERC-20. The token balance is public before wrapping — anyone on-chain can read it."
          status={s4}
          isCancelled={!!mintError && isUserRejection(mintError)}
          onRedo={() => { resetMint() }}
          stepRef={setRef(3)}
        >
          {mintError && (
            <div className="mb-3">
              <StepError
                error={mintError as Error}
                onRetry={() => { resetMint(); handleMint() }}
              />
            </div>
          )}
          {mintAwaitingSig && <Spinner label="Awaiting wallet signature…" />}
          {mintConfirming && mintTxHash && (
            <div className="mb-3 flex flex-col gap-1">
              <Spinner label="Mining…" />
              <TxLink hash={mintTxHash} />
            </div>
          )}
          {mintDone && mintTxHash && (
            <div className="mb-3">
              <TxSuccess label="1,000 USDCMock minted" hash={mintTxHash} />
            </div>
          )}
          {underlyingBalance !== undefined && (
            <p className="mb-3 text-xs text-zinc-600">
              Your USDCMock balance:{' '}
              <span className="text-zinc-400">
                {formatUnits(underlyingBalance as bigint, DEMO_DECIMALS)}
              </span>
            </p>
          )}
          {(s4 === 'active' || (s4 === 'failed' && !isUserRejection(mintError))) && (
            <PrimaryBtn onClick={handleMint} disabled={mintBusy}>
              {mintAwaitingSig ? '⏳ Awaiting signature…'
                : mintConfirming ? '⛏ Mining…'
                : 'Mint 1,000 USDCMock'}
            </PrimaryBtn>
          )}
        </StepCard>

        {/* ── Step 5: Approve ───────────────────────────────────────────── */}
        <StepCard
          number={5}
          title="Approve — allow wrapper to pull USDCMock"
          tagline="Standard ERC-20 allowance. The wrapper will pull exactly 100 USDCMock during the wrap transaction."
          status={s5}
          isCancelled={!!approveError && isUserRejection(approveError)}
          onRedo={resetApprove}
          stepRef={setRef(4)}
        >
          {approveError && (
            <div className="mb-3">
              <StepError
                error={approveError}
                onRetry={() => { resetApprove(); handleApprove() }}
              />
            </div>
          )}
          {approvePending && <div className="mb-3"><Spinner label="Awaiting signature + mining…" /></div>}
          {approveResult && !approvePending && (
            <div className="mb-3">
              <TxSuccess label="Approved 100 USDCMock" hash={approveResult.txHash} />
            </div>
          )}
          {(s5 === 'active' || (s5 === 'failed' && !isUserRejection(approveError))) && (
            <PrimaryBtn onClick={handleApprove} disabled={approvePending}>
              {approvePending ? '⏳ Approving…' : 'Approve 100 USDCMock'}
            </PrimaryBtn>
          )}
        </StepCard>

        {/* ── Step 6: Wrap (shield) ─────────────────────────────────────── */}
        <StepCard
          number={6}
          title="Wrap — FHE-encrypt into confidential ERC-7984"
          tagline="Your 100 USDCMock is encrypted locally, then deposited. On-chain, your balance becomes a ciphertext handle — opaque to everyone except you."
          status={s6}
          isCancelled={!!shieldError && isUserRejection(shieldError)}
          onRedo={() => { resetShield(); setShieldSubmittedHash(null) }}
          stepRef={setRef(5)}
        >
          {shieldError && (
            <div className="mb-3">
              <StepError
                error={shieldError}
                onRetry={() => { resetShield(); setShieldSubmittedHash(null); handleShield() }}
              />
            </div>
          )}
          {shieldPending && !shieldSubmittedHash && (
            <div className="mb-3">
              <Spinner label="FHE-encrypting locally + awaiting wallet signature…" />
            </div>
          )}
          {shieldPending && shieldSubmittedHash && (
            <div className="mb-3 flex flex-col gap-1">
              <Spinner label="Mining wrap transaction…" />
              <TxLink hash={shieldSubmittedHash} />
            </div>
          )}
          {shieldResult && !shieldPending && (
            <div className="mb-3">
              <TxSuccess label="100 USDCMock wrapped into confidential cUSDCMock" hash={shieldResult.txHash} />
            </div>
          )}
          {(s6 === 'active' || (s6 === 'failed' && !isUserRejection(shieldError))) && (
            <PrimaryBtn onClick={handleShield} disabled={shieldPending}>
              {shieldPending
                ? shieldSubmittedHash ? '⛏ Mining…' : '⏳ Encrypting + signing…'
                : 'Wrap 100 USDCMock → cUSDCMock'}
            </PrimaryBtn>
          )}
        </StepCard>

        {/* ── Step 7: Decrypt confidential balance ──────────────────────── */}
        <StepCard
          number={7}
          title="Decrypt — read your confidential balance"
          tagline="Sign an EIP-712 message (zero gas) authorising the Zama relayer to decrypt specifically for you. Nobody else can read the result."
          status={s7}
          isCancelled={!!grantError && isUserRejection(grantError)}
          onRedo={() => { revokePermit([DEMO_WRAPPER]); resetGrant() }}
          stepRef={setRef(6)}
        >
          {checkingPermit && <Spinner label="Checking permit cache…" />}

          {!checkingPermit && !hasPermit && (
            <div className="flex flex-col gap-3">
              {grantError && (
                <StepError
                  error={grantError}
                  onRetry={() => { resetGrant(); grantPermit([DEMO_WRAPPER]) }}
                />
              )}
              {(s7 === 'active' || (s7 === 'failed' && !isUserRejection(grantError))) && (
                <PrimaryBtn
                  onClick={() => { resetGrant(); grantPermit([DEMO_WRAPPER]) }}
                  disabled={grantingPermit}
                >
                  {grantingPermit ? '⏳ Awaiting signature…' : 'Grant permit (sign EIP-712, free)'}
                </PrimaryBtn>
              )}
            </div>
          )}

          {hasPermit && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                  Permit cached
                </span>
                <button
                  onClick={() => { revokePermit([DEMO_WRAPPER]); resetGrant() }}
                  disabled={revokingPermit}
                  className="text-xs text-zinc-600 underline hover:text-zinc-400 disabled:opacity-50"
                >
                  {revokingPermit ? 'Revoking…' : 'Revoke'}
                </button>
              </div>

              {confBalance !== undefined ? (
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
                  <p className="text-xs text-emerald-600">Decrypted confidential balance</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-emerald-300">
                    {formatUnits(confBalance as bigint, DEMO_DECIMALS)}{' '}
                    <span className="text-lg text-emerald-600">{DEMO_SYMBOL}</span>
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    The on-chain value is an opaque ciphertext. This number was decrypted
                    by the Zama relayer using your EIP-712 permit — nobody else can produce this result.
                  </p>
                </div>
              ) : isBalanceError && !fetchingBalance && balanceError ? (
                <StepError error={balanceError} />
              ) : balanceFailures > 0 && fetchingBalance ? (
                <Spinner label={`RPC hiccup — retrying… (attempt ${balanceFailures + 1} of 4)`} />
              ) : loadingBalance ? (
                <div className="flex flex-col gap-1.5">
                  <Spinner label="Reading ciphertext handle from chain…" />
                  <Spinner label="Sending to Zama relayer for decryption…" />
                </div>
              ) : null}
            </div>
          )}
        </StepCard>

        {/* ── Step 8: Unwrap (two-phase) ────────────────────────────────── */}
        <StepCard
          number={8}
          title="Unwrap — redeem confidential balance back to ERC-20"
          tagline="Two on-chain phases: submit encrypted unwrap → FHE network decrypts → finalizeUnwrap settles. The SDK manages both steps; you sign once."
          status={s8}
          isCancelled={!!unshieldError && isUserRejection(unshieldError)}
          onRedo={() => {
            resetUnshield()
            setUnshieldPhase1Hash(null)
            setUnshieldFinalizing(false)
            setUnshieldPhase2Hash(null)
            void refetchBalance()
          }}
          stepRef={setRef(7)}
        >
          {unshieldError && (
            <div className="mb-3">
              <StepError
                error={unshieldError}
                onRetry={() => { resetUnshield(); setUnshieldPhase1Hash(null); setUnshieldFinalizing(false); setUnshieldPhase2Hash(null); handleUnshield() }}
              />
            </div>
          )}

          {/* Phase progress tracker */}
          {(unshieldPending || unshieldPhase1Hash) && !unshieldResult && (
            <div className="mb-4 rounded-lg border border-space-700/40 bg-space-950/70 p-3 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  unshieldPhase1Hash ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'
                }`}>1</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-400">Unwrap submitted</p>
                  {!unshieldPhase1Hash
                    ? <Spinner label="FHE-encrypting + awaiting wallet signature…" />
                    : <TxLink hash={unshieldPhase1Hash} />}
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  unshieldPhase2Hash ? 'bg-emerald-500 text-black'
                    : unshieldFinalizing ? 'bg-amber-500 text-black'
                    : 'bg-zinc-700 text-zinc-300'
                }`}>2</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-zinc-400">Finalize unwrap</p>
                  {unshieldPhase1Hash && !unshieldFinalizing && !unshieldPhase2Hash && (
                    <Spinner label="Waiting for Zama FHE network decryption proof…" />
                  )}
                  {unshieldFinalizing && !unshieldPhase2Hash && (
                    <Spinner label="Proof received — submitting finalizeUnwrap…" />
                  )}
                  {unshieldPhase2Hash && <TxLink hash={unshieldPhase2Hash} />}
                </div>
              </div>
            </div>
          )}

          {unshieldResult && !unshieldPending && (
            <div className="mb-3">
              <TxSuccess
                label="Unwrap complete — USDCMock returned to your ERC-20 balance"
                hash={unshieldResult.txHash}
              />
              {underlyingBalance !== undefined && (
                <p className="mt-2 text-xs text-zinc-500">
                  Your USDCMock balance:{' '}
                  <button
                    onClick={() => void refetchBalance()}
                    className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
                  >
                    {formatUnits(underlyingBalance as bigint, DEMO_DECIMALS)} ↺
                  </button>
                </p>
              )}
            </div>
          )}

          {(s8 === 'active' || (s8 === 'failed' && !isUserRejection(unshieldError))) && (
            <PrimaryBtn onClick={handleUnshield} disabled={unshieldPending}>
              {unshieldPending
                ? unshieldPhase2Hash ? '⛏ Finalizing…'
                  : unshieldFinalizing ? '⏳ Submitting finalize…'
                  : unshieldPhase1Hash ? '⟳ Awaiting FHE proof…'
                  : '⏳ Encrypting + signing…'
                : 'Unwrap 100 cUSDCMock → USDCMock'}
            </PrimaryBtn>
          )}
        </StepCard>

        {/* ── Step 9: Developer handoff (always open) ───────────────────── */}
        <div
          ref={setRef(8)}
          className="scroll-mt-20 rounded-xl border border-blue-900/20 bg-space-800/50 p-4 backdrop-blur-sm"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-space-700 text-xs font-bold text-blue-400">
              9
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-200">Developer Kit</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                The exact hook calls, ABI snippets, and addresses that powered every step above.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/developers"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cipher-700/50 bg-cipher-500/10 px-4 py-2 text-sm font-semibold text-cipher-300 hover:bg-cipher-500/20"
                >
                  Developer Kit →
                </Link>
                <Link
                  href="/registry"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                >
                  Browse all wrappers →
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
