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

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isConnecting}
        className="btn-cipher rounded-lg border border-cipher-500 bg-cipher-500/10 px-4 py-2 text-sm font-medium text-cipher-300 hover:bg-cipher-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isConnecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    )
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-400">
          Wrong network
        </span>
        <button
          onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
          disabled={isSwitching}
          className="rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50"
        >
          {isSwitching ? 'Switching…' : 'Switch to Sepolia'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="rounded bg-cipher-500/10 px-3 py-1 font-mono text-sm text-cipher-300">
        {shorten(address!)}
      </span>
      <button
        onClick={() => disconnect()}
        className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        Disconnect
      </button>
    </div>
  )
}
