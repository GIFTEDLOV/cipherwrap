'use client'

import { useAccount, useSwitchChain } from 'wagmi'
import { SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'
import { useChainGuard } from '@/components/ChainGuard'

/**
 * Full-width amber banner shown whenever the connected wallet is not on Sepolia.
 * Uses ChainGuard (window.ethereum direct read) — not wagmi's useChainId() —
 * so it correctly detects any non-Sepolia chain regardless of wagmi's config.
 */
export function WrongNetworkBanner() {
  const { isConnected } = useAccount()
  const { walletChainId, onSepolia } = useChainGuard()
  const { switchChain, isPending } = useSwitchChain()

  // Not connected, or we haven't read the chain yet, or already on Sepolia
  if (!isConnected || walletChainId === null || onSepolia) return null

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
