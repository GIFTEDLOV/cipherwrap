import { SEPOLIA_CHAIN_ID } from '@/config/zamaSepolia'

/**
 * True only when chainId is Sepolia (11155111).
 * Use this inside handlers — pass getChainId(wagmiConfig) for a live,
 * non-stale read that bypasses React's render cycle.
 */
export function isOnSepolia(chainId: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID
}
