import { describe, it, expect } from 'vitest'
import { isOnSepolia } from './networkGuard'

describe('isOnSepolia network guard', () => {
  it('permits Sepolia (11155111)', () => {
    expect(isOnSepolia(11155111)).toBe(true)
  })

  it('blocks Ethereum mainnet (1)', () => {
    expect(isOnSepolia(1)).toBe(false)
  })

  it('blocks Polygon (137)', () => {
    expect(isOnSepolia(137)).toBe(false)
  })

  it('blocks Arbitrum (42161)', () => {
    expect(isOnSepolia(42161)).toBe(false)
  })

  it('blocks zero / unset chain (0)', () => {
    expect(isOnSepolia(0)).toBe(false)
  })

  it('blocks Sepolia-adjacent chain id (11155112) — not a typo of real Sepolia', () => {
    expect(isOnSepolia(11155112)).toBe(false)
  })
})
