'use client'

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'

/**
 * Full-width amber banner shown whenever the connected wallet is not on Sepolia.
 * Renders nothing when disconnected or already on the right chain.
 * Self-contained: manages the chain switch itself.
 */
export function WrongNetworkBanner() {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  if (!isConnected || chainId === SEPOLIA_CHAIN_ID) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="mb-6 flex flex-col gap-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-xl text-amber-400" aria-hidden="true">⚠</span>
        <div>
          <p className="text-sm font-bold text-amber-300">Wrong network — all actions disabled</p>
          <p className="mt-0.5 text-xs text-amber-500/80">
            CipherWrap only works on Sepolia (chainId {SEPOLIA_CHAIN_ID}). Every Zama FHE contract
            is deployed there. Transactions on any other network will fail or be silently rejected.
          </p>
        </div>
      </div>
      <button
        onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
        disabled={isPending}
        className="shrink-0 rounded-lg border border-amber-500/60 bg-amber-500/20 px-5 py-2.5 text-sm font-bold text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/30 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Switching…' : 'Switch to Sepolia'}
      </button>
    </div>
  )
}
