import { SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'

/**
 * Module-level wallet chain ID store.
 *
 * Updated synchronously inside the window.ethereum `chainChanged` handler —
 * BEFORE React schedules a re-render. This means getWalletChainId() called
 * inside any event handler (e.g. a button click) will always return the
 * current chain, even during the window between chainChanged firing and React
 * processing its next render cycle.
 *
 * Do NOT read this inside render — use the ChainGuard context instead.
 * This module is for use in imperative handlers only.
 */

let _chainId: number | null = null

export function setWalletChainId(chainId: number | null): void {
  _chainId = chainId
}

export function getWalletChainId(): number | null {
  return _chainId
}

export function isWalletOnSepolia(): boolean {
  return _chainId === SEPOLIA_CHAIN_ID
}

/** Only for Vitest — do not call in production code. */
export function _resetChainIdStoreForTest(): void {
  _chainId = null
}
