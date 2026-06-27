'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const onSepolia = chainId === SEPOLIA_CHAIN_ID

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isConnecting}
        className="btn-gold rounded-lg px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Always show wallet address */}
      <span
        className="rounded-lg px-3 py-1.5 font-mono text-sm font-medium"
        style={{
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          color: '#93c5fd',
        }}
      >
        {shorten(address!)}
      </span>

      {/* Compact wrong-network indicator — visible whenever not on Sepolia */}
      {!onSepolia && (
        <>
          <span
            className="rounded-md px-2 py-0.5 text-xs font-bold"
            style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
          >
            ⚠ Wrong network
          </span>
          <button
            onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
            disabled={isSwitching}
            className="rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/25 hover:text-amber-200 disabled:opacity-50"
          >
            {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
          </button>
        </>
      )}

      {/* Disconnect always available */}
      <button
        onClick={() => disconnect()}
        className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-slate-600 hover:text-slate-300"
      >
        Disconnect
      </button>
    </div>
  )
}
