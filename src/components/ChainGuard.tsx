'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'
import { setWalletChainId } from '@/lib/chainIdStore'

/**
 * ChainGuard: the single source of truth for the wallet's actual chain.
 *
 * WHY NOT useChainId() from wagmi?
 * wagmi's useChainId() reads config.state.chainId, which is initialized to
 * chains[0].id (Sepolia = 11155111). When Rabby (or any wallet) is on a chain
 * that is NOT in wagmi's `chains` array, wagmi may not update its store,
 * causing useChainId() to permanently return 11155111 regardless of the actual
 * wallet network. All network guards then silently pass on any chain.
 *
 * This provider bypasses wagmi entirely: it reads eth_chainId directly from
 * window.ethereum and subscribes to chainChanged events on the provider.
 * The module-level chainIdStore is updated synchronously inside the event
 * handler so that imperative handlers (not just React renders) always see the
 * live chain.
 */

interface EthereumProvider {
  request(args: { method: string }): Promise<string>
  on(event: string, handler: (value: string) => void): void
  removeListener?(event: string, handler: (value: string) => void): void
}

interface ChainGuardValue {
  /** Actual wallet chain ID, or null if disconnected / not yet read */
  walletChainId: number | null
  /** True only when walletChainId === 11155111 */
  onSepolia: boolean
}

const ChainGuardCtx = createContext<ChainGuardValue>({
  walletChainId: null,
  onSepolia: false,
})

function parseChainId(raw: string | number): number {
  if (typeof raw === 'number') return raw
  // EIP-1193 returns hex strings like "0x1"
  return parseInt(raw, 16)
}

export function ChainGuardProvider({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount()
  const [walletChainId, setLocal] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!isConnected) {
      // Wallet disconnected — clear everything
      setWalletChainId(null)
      setLocal(null)
      return
    }

    const provider = (window as { ethereum?: EthereumProvider }).ethereum
    if (!provider) return

    // Read current chain ID immediately (async, but fires within a few ms)
    provider
      .request({ method: 'eth_chainId' })
      .then((raw: string) => {
        const id = parseChainId(raw)
        setWalletChainId(id)  // synchronous module store — used by handlers
        setLocal(id)           // React state — triggers UI re-render
      })
      .catch(() => {})

    // Subscribe to every future chain change from the provider
    const onChainChanged = (raw: string | number) => {
      const id = parseChainId(raw as string)
      // CRITICAL: module store is updated FIRST, synchronously, before React
      // schedules anything. Handlers calling getWalletChainId() immediately
      // after chainChanged fires will see the new chain — no staleness window.
      setWalletChainId(id)
      setLocal(id)
    }

    provider.on('chainChanged', onChainChanged)
    return () => {
      provider.removeListener?.('chainChanged', onChainChanged)
    }
  }, [isConnected])

  return (
    <ChainGuardCtx.Provider
      value={{
        walletChainId,
        onSepolia: walletChainId === SEPOLIA_CHAIN_ID,
      }}
    >
      {children}
    </ChainGuardCtx.Provider>
  )
}

export function useChainGuard(): ChainGuardValue {
  return useContext(ChainGuardCtx)
}
