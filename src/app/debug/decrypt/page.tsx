'use client'

import { useState } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  useHasPermit,
  useGrantPermit,
  useConfidentialBalance,
  useRevokePermits,
} from '@zama-fhe/react-sdk'
import {
  SigningRejectedError,
  NoCiphertextError,
  TransportKeyPairExpiredError,
} from '@zama-fhe/sdk'
import { KNOWN_WRAPPERS, SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'
import { WrongNetworkBanner } from '@/components/WrongNetworkBanner'

const WRAPPER_OPTIONS = Object.values(KNOWN_WRAPPERS)
const DEFAULT_WRAPPER = '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639' // cUSDCMock

// ── small reusable pieces ──────────────────────────────────────────────────

function Banner({
  variant,
  title,
  body,
}: {
  variant: 'info' | 'warn'
  title: string
  body: string
}) {
  const styles =
    variant === 'warn'
      ? 'border-amber-600/40 bg-amber-500/5 text-amber-300'
      : 'border-zinc-700 bg-zinc-900/50 text-zinc-300'
  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm opacity-75">{body}</p>
    </div>
  )
}

function StepCard({
  step,
  title,
  done,
  children,
}: {
  step: number
  title: string
  done: boolean
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-blue-900/20 bg-space-800/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            done ? 'bg-emerald-500 text-black' : 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {step}
        </span>
        <h2 className="font-semibold text-zinc-200">{title}</h2>
        {done && (
          <span className="ml-auto text-xs font-medium text-emerald-400">
            ✓ Done
          </span>
        )}
      </div>
      {children}
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

function ErrorPanel({
  error,
  isBalance = false,
}: {
  error: Error
  isBalance?: boolean
}) {
  let title: string
  let hint: string

  if (error instanceof SigningRejectedError) {
    title = 'Signature rejected'
    hint =
      'You cancelled the MetaMask prompt. Click the button again when ready.'
  } else if (error instanceof NoCiphertextError) {
    title = 'No ciphertext — balance is 0 or uninitialized'
    hint =
      'The wrapper has no encrypted balance for your address yet. Mint the underlying token from the faucet, then wrap a small amount. Come back to decrypt afterwards.'
  } else if (error instanceof TransportKeyPairExpiredError) {
    title = 'Session expired'
    hint =
      'The EIP-712 keypair has expired (30-day TTL). Revoke the permit and grant a fresh one.'
  } else {
    title = error.message || 'Unexpected error'
    hint = `Error class: ${error.constructor?.name ?? 'Error'}`
  }

  return (
    <div className="rounded-lg border border-red-800/40 bg-red-950/10 p-3 text-sm">
      <p className="font-semibold text-red-400">{title}</p>
      <p className="mt-1 text-zinc-500">{hint}</p>
      {!isBalance && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400">
            Stack trace
          </summary>
          <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-zinc-600">
            {error.stack ?? error.message}
          </pre>
        </details>
      )}
    </div>
  )
}

// ── page ───────────────────────────────────────────────────────────────────

export default function DebugDecryptPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const onSepolia = chainId === SEPOLIA_CHAIN_ID

  const [selectedWrapper, setSelectedWrapper] =
    useState<`0x${string}`>(DEFAULT_WRAPPER)

  // Check if a permit already exists for the selected wrapper
  const { data: hasPermit, isLoading: checkingPermit } = useHasPermit(
    { contractAddresses: [selectedWrapper] },
    { enabled: isConnected && onSepolia },
  )

  // Mutation to sign the EIP-712 permit
  const {
    mutate: grantPermit,
    isPending: grantingPermit,
    error: grantError,
    reset: resetGrant,
  } = useGrantPermit()

  // Dev utility: revoke the permit so we can re-test the grant flow
  const { mutate: revokePermit, isPending: revokingPermit } = useRevokePermits()

  // Read the confidential balance and decrypt — only runs once permit exists.
  // retry/retryDelay are TanStack Query options; transport-level retries also
  // kick in via the fallback transport in wagmiConfig.
  const {
    data: balance,
    isLoading: loadingBalance,
    isFetching: fetchingBalance,
    failureCount: balanceFailures,
    isError: isBalanceError,
    error: balanceError,
  } = useConfidentialBalance(
    { address: selectedWrapper, account: address },
    {
      enabled: isConnected && onSepolia && hasPermit === true,
      retry: 3,
      retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 8000),
    },
  )

  function handleWrapperChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedWrapper(e.target.value as `0x${string}`)
    resetGrant()
  }

  const selectedMeta = KNOWN_WRAPPERS[selectedWrapper.toLowerCase()]

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Page header */}
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-xs text-amber-400">
          /debug
        </span>
        <h1 className="font-display text-xl font-bold text-slate-100">
          Confidential Balance Decrypt
        </h1>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Proof sprint step 7 — reads{' '}
        <code className="rounded bg-zinc-800 px-1 text-zinc-300">
          confidentialBalanceOf
        </code>{' '}
        handle and decrypts it via Zama EIP-712 user decryption.
      </p>
      <p className="mb-8 text-sm text-zinc-500">
        Need tokens first?{' '}
        <a href="/debug/wrap" className="text-cipher-400 underline underline-offset-2 hover:text-cipher-300">
          Go to /debug/wrap
        </a>{' '}
        to mint, approve, and shield, then come back here to decrypt.
      </p>

      {/* Wrapper selector */}
      <div className="mb-6 rounded-xl border border-blue-900/20 bg-space-800/60 p-4 backdrop-blur-sm">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
          Wrapper under test
        </label>
        <select
          value={selectedWrapper}
          onChange={handleWrapperChange}
          className="w-full rounded-lg border border-space-700 bg-space-950 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none"
        >
          {WRAPPER_OPTIONS.map((w) => (
            <option key={w.wrapper} value={w.wrapper}>
              {w.symbol} — {w.wrapper.slice(0, 12)}…
            </option>
          ))}
        </select>
        {selectedMeta?.note && (
          <p className="mt-2 text-xs text-amber-500">{selectedMeta.note}</p>
        )}
      </div>

      {/* Gate: not connected */}
      {!isConnected && (
        <Banner
          variant="info"
          title="Wallet not connected"
          body="Connect your wallet using the button in the header, then return here."
        />
      )}

      {/* Gate: wrong network */}
      <WrongNetworkBanner />

      {/* Main flow: connected + on Sepolia */}
      {isConnected && onSepolia && (
        <div className="flex flex-col gap-4">
          {/* Step 1 — EIP-712 permit */}
          <StepCard step={1} title="EIP-712 Permit" done={hasPermit === true}>
            {checkingPermit ? (
              <Spinner label="Checking stored permits…" />
            ) : hasPermit ? (
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-400">
                  Permit cached
                </span>
                <button
                  onClick={() => revokePermit([selectedWrapper])}
                  disabled={revokingPermit}
                  className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400 disabled:opacity-50"
                >
                  {revokingPermit ? 'Revoking…' : '[dev] Revoke & re-test'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-400">
                  No permit found for{' '}
                  <span className="font-semibold text-zinc-200">
                    {selectedMeta?.symbol ?? 'this wrapper'}
                  </span>
                  . You must sign an EIP-712 message that authorises the Zama
                  relayer to decrypt your balance. This is a{' '}
                  <strong className="text-zinc-300">
                    free off-chain signature
                  </strong>{' '}
                  — no gas, no on-chain transaction.
                </p>

                {grantError && <ErrorPanel error={grantError} />}

                <button
                  onClick={() => {
                    resetGrant()
                    grantPermit([selectedWrapper])
                  }}
                  disabled={grantingPermit}
                  className="btn-cipher rounded-lg border border-cipher-500 bg-cipher-500/10 px-4 py-2.5 text-sm font-semibold text-cipher-300 hover:bg-cipher-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {grantingPermit
                    ? '⏳ Waiting for wallet signature…'
                    : grantError
                      ? 'Retry — Grant Permit'
                      : 'Grant Permit  (sign EIP-712)'}
                </button>
              </div>
            )}
          </StepCard>

          {/* Step 2 — Decrypt balance (only shown after permit) */}
          {hasPermit && (
            <StepCard
              step={2}
              title="Decrypted Confidential Balance"
              done={balance !== undefined}
            >
              {balance !== undefined ? (
                <div>
                  <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                      Decrypted clear value
                    </p>
                    <p className="font-mono text-3xl font-bold tracking-tight text-emerald-300">
                      {balance.toString()}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Raw integer in the token&apos;s smallest unit (multiply by
                      10⁻¹⁸ for ether-style tokens, or 10⁻⁶ for USDC-style).
                      Non-zero proves end-to-end FHE decryption is working.
                    </p>
                  </div>
                </div>
              ) : isBalanceError && balanceError ? (
                <ErrorPanel error={balanceError} isBalance />
              ) : balanceFailures > 0 && fetchingBalance ? (
                <Spinner
                  label={`RPC hiccup — retrying… (attempt ${balanceFailures + 1} of 4)`}
                />
              ) : loadingBalance ? (
                <div className="flex flex-col gap-2">
                  <Spinner label="Reading ciphertext handle from chain…" />
                  <Spinner label="Sending to Zama relayer for user decryption…" />
                </div>
              ) : null}
            </StepCard>
          )}
        </div>
      )}
    </div>
  )
}
