'use client'

import { useState } from 'react'
import { parseUnits, formatUnits } from 'viem'
import {
  useAccount,
  useChainId,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import {
  useShield,
  useApproveUnderlying,
  useHasPermit,
  useGrantPermit,
  useConfidentialBalance,
  useRevokePermits,
} from '@zama-fhe/react-sdk'
import {
  SigningRejectedError,
  TransactionRevertedError,
  EncryptionFailedError,
  NoCiphertextError,
} from '@zama-fhe/sdk'
import { KNOWN_WRAPPERS, SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'
import { mockErc20Abi } from '@/abis/mockErc20'

const MOCK_WRAPPERS = Object.values(KNOWN_WRAPPERS).filter(
  (w) => w.faucet === 'public-mock',
)
const DEFAULT_WRAPPER: `0x${string}` =
  '0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639' // cUSDCMock
const MINT_DEFAULT = '10000'
const WRAP_DEFAULT = '100'
// Hard cap: 999,999 tokens (below the 1,000,000-per-call limit)
const MINT_HUMAN_CAP = 999_999

// ── reusable UI ─────────────────────────────────────────────────────────────

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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
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

function TxLink({ txHash }: { txHash: `0x${string}` }) {
  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 block truncate font-mono text-xs text-cipher-400 underline underline-offset-2 hover:text-cipher-300"
    >
      {txHash}
    </a>
  )
}

function TxSuccess({
  label,
  txHash,
}: {
  label: string
  txHash: `0x${string}`
}) {
  return (
    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-3">
      <p className="text-sm font-semibold text-emerald-400">{label}</p>
      <TxLink txHash={txHash} />
    </div>
  )
}

function TxPending({ label, txHash }: { label: string; txHash?: `0x${string}` | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Spinner label={label} />
      {txHash && (
        <p className="text-xs text-zinc-500">
          Submitted:{' '}
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-zinc-400 underline underline-offset-2 hover:text-zinc-300"
          >
            {txHash.slice(0, 18)}…
          </a>
        </p>
      )}
    </div>
  )
}

function ZamaErrorPanel({ error }: { error: Error }) {
  let title: string
  let hint: string

  if (error instanceof SigningRejectedError) {
    title = 'Signature rejected'
    hint = 'You cancelled the wallet prompt. Click the button again when ready.'
  } else if (error instanceof TransactionRevertedError) {
    title = 'Transaction reverted'
    hint =
      'The on-chain transaction failed. Check the Etherscan link for the revert reason.'
  } else if (error instanceof EncryptionFailedError) {
    title = 'FHE encryption failed'
    hint =
      'The Zama relayer could not encrypt the amount. Check your network connection and try again.'
  } else if (error instanceof NoCiphertextError) {
    title = 'No ciphertext — nothing wrapped yet'
    hint = 'Complete steps 8–10 first, then decrypt.'
  } else if (error.name === 'UserRejectedRequestError') {
    title = 'Transaction rejected'
    hint = 'You declined the transaction in your wallet. Click the button again when ready.'
  } else {
    title = error.message || 'Unexpected error'
    hint = `Error class: ${error.constructor?.name ?? 'Error'}`
  }

  return (
    <div className="rounded-lg border border-red-800/40 bg-red-950/10 p-3 text-sm">
      <p className="font-semibold text-red-400">{title}</p>
      <p className="mt-1 text-zinc-500">{hint}</p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-zinc-600 hover:text-zinc-400">
          Stack trace
        </summary>
        <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-zinc-600">
          {error.stack ?? error.message}
        </pre>
      </details>
    </div>
  )
}

function AmountInput({
  label,
  value,
  onChange,
  symbol,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  symbol: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-24 shrink-0 text-xs text-zinc-500">{label}</label>
      <input
        type="number"
        min="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50 focus:border-cipher-500 focus:outline-none"
      />
      <span className="text-xs text-zinc-500">{symbol}</span>
    </div>
  )
}

function ActionButton({
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
      className="btn-cipher rounded-lg border border-cipher-500 bg-cipher-500/10 px-4 py-2.5 text-sm font-semibold text-cipher-300 hover:bg-cipher-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

export default function DebugWrapPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const onSepolia = chainId === SEPOLIA_CHAIN_ID

  const [selectedWrapper, setSelectedWrapper] =
    useState<`0x${string}`>(DEFAULT_WRAPPER)
  const [mintAmountStr, setMintAmountStr] = useState(MINT_DEFAULT)
  const [wrapAmountStr, setWrapAmountStr] = useState(WRAP_DEFAULT)
  // intermediate tx hash from shield onShieldSubmitted callback
  const [shieldSubmittedHash, setShieldSubmittedHash] =
    useState<`0x${string}` | null>(null)

  const selectedMeta = KNOWN_WRAPPERS[selectedWrapper.toLowerCase()]
  const underlyingAddress = selectedMeta?.underlying as `0x${string}` | undefined

  // ── read token decimals ──────────────────────────────────────────────────
  const { data: decimalsData } = useReadContract({
    address: underlyingAddress,
    abi: mockErc20Abi,
    functionName: 'decimals',
    query: { enabled: !!underlyingAddress && isConnected && onSepolia },
  })
  const decimals = typeof decimalsData === 'number' ? decimalsData : 6

  // ── read underlying ERC-20 balance ───────────────────────────────────────
  // Always pass a defined args tuple; enabled: false prevents execution when address is absent.
  const {
    data: underlyingBalance,
    refetch: refetchUnderlyingBalance,
  } = useReadContract({
    address: underlyingAddress,
    abi: mockErc20Abi,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!underlyingAddress && !!address && isConnected && onSepolia },
  })

  // ── amount helpers ───────────────────────────────────────────────────────
  function parseMintUnits(): bigint | null {
    try {
      const human = Number(mintAmountStr)
      if (!mintAmountStr || human <= 0 || human > MINT_HUMAN_CAP) return null
      return parseUnits(mintAmountStr, decimals)
    } catch {
      return null
    }
  }

  function parseWrapUnits(): bigint | null {
    try {
      if (!wrapAmountStr || Number(wrapAmountStr) <= 0) return null
      return parseUnits(wrapAmountStr, decimals)
    } catch {
      return null
    }
  }

  // ── Step 8: Mint faucet tokens ───────────────────────────────────────────
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

  const mintBusy = mintAwaitingSig || mintConfirming
  const mintError = mintWriteError ?? mintConfirmError

  function handleMint() {
    const amount = parseMintUnits()
    if (!amount || !address || !underlyingAddress) return
    resetMint()
    callMint({
      address: underlyingAddress,
      abi: mockErc20Abi,
      functionName: 'mint',
      args: [address, amount],
    })
  }

  // ── Step 9: Approve wrapper to spend underlying ──────────────────────────
  const {
    mutate: doApprove,
    isPending: approvePending,
    data: approveResult,
    error: approveError,
    reset: resetApprove,
  } = useApproveUnderlying(selectedWrapper)

  const approveDone = !!approveResult

  function handleApprove() {
    const amount = parseWrapUnits()
    if (!amount) return
    resetApprove()
    doApprove({ amount })
  }

  // ── Step 10: Shield (wrap) into confidential ERC-7984 ───────────────────
  const {
    mutate: doShield,
    isPending: shieldPending,
    data: shieldResult,
    error: shieldError,
    reset: resetShield,
  } = useShield({ address: selectedWrapper })

  const shieldDone = !!shieldResult

  function handleShield() {
    const amount = parseWrapUnits()
    if (!amount) return
    resetShield()
    setShieldSubmittedHash(null)
    doShield({
      amount,
      approvalStrategy: 'skip',
      onShieldSubmitted: (hash) => setShieldSubmittedHash(hash),
    })
  }

  // ── Step 11: Re-decrypt confidential balance ─────────────────────────────
  const { data: hasPermit, isLoading: checkingPermit } = useHasPermit(
    { contractAddresses: [selectedWrapper] },
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
    data: confidentialBalance,
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

  // ── wrapper selector change ──────────────────────────────────────────────
  function handleWrapperChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedWrapper(e.target.value as `0x${string}`)
    resetMint()
    resetApprove()
    resetShield()
    resetGrant()
    setShieldSubmittedHash(null)
  }

  const symbol = selectedMeta?.symbol ?? 'TOKEN'

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Page header */}
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-xs text-amber-400">
          /debug
        </span>
        <h1 className="text-xl font-bold text-zinc-100">
          Mint → Approve → Wrap → Decrypt
        </h1>
      </div>
      <p className="mb-8 text-sm text-zinc-500">
        Proof sprint steps 8–11. Mint mock tokens, approve the wrapper, shield
        them into a confidential ERC-7984 balance, then decrypt to confirm.
      </p>

      {/* Wrapper selector — mock wrappers only */}
      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Wrapper under test (public-mint only)
        </label>
        <select
          value={selectedWrapper}
          onChange={handleWrapperChange}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-cipher-500 focus:outline-none"
        >
          {MOCK_WRAPPERS.map((w) => (
            <option key={w.wrapper} value={w.wrapper}>
              {w.symbol} — {w.wrapper.slice(0, 12)}…
            </option>
          ))}
        </select>
        {selectedMeta?.note && (
          <p className="mt-2 text-xs text-amber-500">{selectedMeta.note}</p>
        )}
        {underlyingAddress && (
          <p className="mt-1.5 text-xs text-zinc-600">
            Underlying:{' '}
            <a
              href={`https://sepolia.etherscan.io/address/${underlyingAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-zinc-500 hover:text-zinc-400"
            >
              {underlyingAddress}
            </a>
          </p>
        )}
        {underlyingBalance !== undefined && (
          <p className="mt-1 text-xs text-zinc-500">
            Your {symbol.replace('c', '')} balance:{' '}
            <span className="font-semibold text-zinc-300">
              {formatUnits(underlyingBalance as bigint, decimals)}
            </span>
            <button
              onClick={() => void refetchUnderlyingBalance()}
              className="ml-2 text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
            >
              refresh
            </button>
          </p>
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
      {isConnected && !onSepolia && (
        <Banner
          variant="warn"
          title="Wrong network"
          body="Switch to Sepolia using the button in the header. All steps require Sepolia."
        />
      )}

      {/* Main flow */}
      {isConnected && onSepolia && (
        <div className="flex flex-col gap-4">

          {/* ── Step 8: Mint ──────────────────────────────────────────────── */}
          <StepCard step={8} title={`Faucet — mint mock ${symbol.replace('c', '')}`} done={mintDone}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-400">
                Calls{' '}
                <code className="rounded bg-zinc-800 px-1 text-zinc-300">
                  mint(address, uint256)
                </code>{' '}
                on the underlying ERC-20. Cap is 1,000,000 tokens per call; we
                default to 10,000 and hard-cap at 999,999.
              </p>

              <AmountInput
                label="Mint amount"
                value={mintAmountStr}
                onChange={setMintAmountStr}
                symbol={symbol.replace('c', '')}
                disabled={mintBusy || mintDone}
              />

              {mintError && <ZamaErrorPanel error={mintError as Error} />}

              {mintAwaitingSig && (
                <Spinner label="Waiting for wallet signature…" />
              )}
              {mintConfirming && mintTxHash && (
                <TxPending label="Mining…" txHash={mintTxHash} />
              )}
              {mintDone && mintTxHash && (
                <TxSuccess label="Mint confirmed" txHash={mintTxHash} />
              )}

              {!mintDone && (
                <ActionButton
                  onClick={handleMint}
                  disabled={
                    mintBusy ||
                    !parseMintUnits() ||
                    !address ||
                    !underlyingAddress
                  }
                >
                  {mintAwaitingSig
                    ? '⏳ Awaiting signature…'
                    : mintConfirming
                      ? '⛏ Mining…'
                      : mintError
                        ? 'Retry — Mint tokens'
                        : `Mint ${mintAmountStr} ${symbol.replace('c', '')}`}
                </ActionButton>
              )}
              {mintDone && (
                <button
                  onClick={() => { resetMint(); void refetchUnderlyingBalance() }}
                  className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
                >
                  Mint again
                </button>
              )}
            </div>
          </StepCard>

          {/* ── Step 9: Approve ───────────────────────────────────────────── */}
          <StepCard step={9} title="Approve wrapper to spend underlying" done={approveDone}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-400">
                Calls{' '}
                <code className="rounded bg-zinc-800 px-1 text-zinc-300">
                  approve(wrapper, amount)
                </code>{' '}
                on the underlying ERC-20 so the wrapper contract can pull the
                tokens during the shield.
              </p>

              <AmountInput
                label="Approve amount"
                value={wrapAmountStr}
                onChange={setWrapAmountStr}
                symbol={symbol.replace('c', '')}
                disabled={approvePending || approveDone}
              />

              {approveError && <ZamaErrorPanel error={approveError} />}

              {approvePending && (
                <Spinner label="Awaiting wallet signature + mining…" />
              )}
              {approveDone && approveResult && (
                <TxSuccess label="Approval confirmed" txHash={approveResult.txHash} />
              )}

              {!approveDone && (
                <ActionButton
                  onClick={handleApprove}
                  disabled={approvePending || !parseWrapUnits()}
                >
                  {approvePending
                    ? '⏳ Approving…'
                    : approveError
                      ? 'Retry — Approve'
                      : `Approve ${wrapAmountStr} ${symbol.replace('c', '')}`}
                </ActionButton>
              )}
              {approveDone && (
                <button
                  onClick={resetApprove}
                  className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
                >
                  Re-approve
                </button>
              )}
            </div>
          </StepCard>

          {/* ── Step 10: Shield ───────────────────────────────────────────── */}
          <StepCard step={10} title="Shield (wrap) into confidential balance" done={shieldDone}>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-400">
                FHE-encrypts the amount locally, then calls{' '}
                <code className="rounded bg-zinc-800 px-1 text-zinc-300">
                  wrap
                </code>{' '}
                on the ERC-7984 wrapper. Uses the same amount entered in step 9
                and skips the built-in approval (you approved explicitly above).
              </p>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
                <span className="text-zinc-500">Shielding </span>
                <span className="font-semibold text-zinc-200">{wrapAmountStr} {symbol.replace('c', '')}</span>
                <span className="text-zinc-500"> → </span>
                <span className="font-semibold text-cipher-400">{wrapAmountStr} {symbol}</span>
              </div>

              {shieldError && <ZamaErrorPanel error={shieldError} />}

              {shieldPending && !shieldSubmittedHash && (
                <Spinner label="FHE-encrypting + awaiting wallet signature…" />
              )}
              {shieldPending && shieldSubmittedHash && (
                <TxPending label="Mining shield transaction…" txHash={shieldSubmittedHash} />
              )}
              {shieldDone && shieldResult && (
                <TxSuccess label="Shield confirmed — tokens are now confidential" txHash={shieldResult.txHash} />
              )}

              {!shieldDone && (
                <ActionButton
                  onClick={handleShield}
                  disabled={shieldPending || !parseWrapUnits()}
                >
                  {shieldPending
                    ? shieldSubmittedHash
                      ? '⛏ Mining…'
                      : '⏳ Encrypting + signing…'
                    : shieldError
                      ? 'Retry — Shield tokens'
                      : `Shield ${wrapAmountStr} ${symbol.replace('c', '')} → ${symbol}`}
                </ActionButton>
              )}
              {shieldDone && (
                <button
                  onClick={() => { resetShield(); setShieldSubmittedHash(null) }}
                  className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-400"
                >
                  Shield again
                </button>
              )}
            </div>
          </StepCard>

          {/* ── Step 11: Re-decrypt ───────────────────────────────────────── */}
          <StepCard
            step={11}
            title="Decrypt — confirm confidential balance changed"
            done={confidentialBalance !== undefined}
          >
            <div className="flex flex-col gap-3">
              <p className="text-sm text-zinc-400">
                Reads{' '}
                <code className="rounded bg-zinc-800 px-1 text-zinc-300">
                  confidentialBalanceOf
                </code>{' '}
                and decrypts via Zama EIP-712 user decryption. If you visited{' '}
                <code className="rounded bg-zinc-800 px-1 text-zinc-300">
                  /debug/decrypt
                </code>{' '}
                first, your permit is already cached and decryption runs
                automatically.
              </p>

              {/* Permit sub-step */}
              {checkingPermit ? (
                <Spinner label="Checking permit cache…" />
              ) : !hasPermit ? (
                <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
                  <p className="text-sm text-zinc-400">
                    No permit found. Sign a free EIP-712 message (no gas) to
                    authorise the Zama relayer to decrypt your balance.
                  </p>

                  {grantError && <ZamaErrorPanel error={grantError} />}

                  <ActionButton
                    onClick={() => {
                      resetGrant()
                      grantPermit([selectedWrapper])
                    }}
                    disabled={grantingPermit}
                  >
                    {grantingPermit
                      ? '⏳ Waiting for signature…'
                      : grantError
                        ? 'Retry — Grant Permit'
                        : 'Grant Permit (sign EIP-712)'}
                  </ActionButton>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
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
              )}

              {/* Balance display */}
              {hasPermit && (
                <>
                  {confidentialBalance !== undefined ? (
                    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">
                        Decrypted confidential balance
                      </p>
                      <p className="font-mono text-3xl font-bold tracking-tight text-emerald-300">
                        {formatUnits(confidentialBalance as bigint, decimals)}{' '}
                        <span className="text-xl text-emerald-600">{symbol}</span>
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Raw:{' '}
                        <span className="font-mono">
                          {(confidentialBalance as bigint).toString()}
                        </span>{' '}
                        (smallest unit). A non-zero value confirms end-to-end
                        FHE wrap + decrypt.
                      </p>
                    </div>
                  ) : isBalanceError && balanceError ? (
                    <div className="rounded-lg border border-red-800/40 bg-red-950/10 p-3 text-sm">
                      {balanceError instanceof NoCiphertextError ? (
                        <>
                          <p className="font-semibold text-red-400">No ciphertext yet</p>
                          <p className="mt-1 text-zinc-500">
                            Your confidential balance is empty (never shielded or shield
                            not yet indexed). Complete steps 8–10 first.
                          </p>
                        </>
                      ) : (
                        <ZamaErrorPanel error={balanceError} />
                      )}
                    </div>
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
                </>
              )}
            </div>
          </StepCard>
        </div>
      )}
    </div>
  )
}
