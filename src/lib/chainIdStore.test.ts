import { describe, it, expect, beforeEach } from 'vitest'
import {
  setWalletChainId,
  getWalletChainId,
  isWalletOnSepolia,
  _resetChainIdStoreForTest,
} from './chainIdStore'

describe('chainIdStore', () => {
  beforeEach(_resetChainIdStoreForTest)

  it('returns null before any chain is set', () => {
    expect(getWalletChainId()).toBeNull()
  })

  it('isWalletOnSepolia returns false when chain is null', () => {
    expect(isWalletOnSepolia()).toBe(false)
  })

  it('stores and returns Sepolia (11155111)', () => {
    setWalletChainId(11155111)
    expect(getWalletChainId()).toBe(11155111)
  })

  it('isWalletOnSepolia returns true for Sepolia', () => {
    setWalletChainId(11155111)
    expect(isWalletOnSepolia()).toBe(true)
  })

  it('isWalletOnSepolia returns false for Ethereum mainnet (1)', () => {
    setWalletChainId(1)
    expect(isWalletOnSepolia()).toBe(false)
  })

  it('isWalletOnSepolia returns false for Polygon (137)', () => {
    setWalletChainId(137)
    expect(isWalletOnSepolia()).toBe(false)
  })

  it('isWalletOnSepolia returns false for Arbitrum (42161)', () => {
    setWalletChainId(42161)
    expect(isWalletOnSepolia()).toBe(false)
  })

  it('updates correctly on chain switch (mainnet → Sepolia)', () => {
    setWalletChainId(1)
    expect(isWalletOnSepolia()).toBe(false)
    setWalletChainId(11155111)
    expect(isWalletOnSepolia()).toBe(true)
  })

  it('updates correctly on chain switch (Sepolia → mainnet)', () => {
    setWalletChainId(11155111)
    expect(isWalletOnSepolia()).toBe(true)
    setWalletChainId(1)
    expect(isWalletOnSepolia()).toBe(false)
  })

  it('clears correctly when wallet disconnects (null)', () => {
    setWalletChainId(11155111)
    setWalletChainId(null)
    expect(getWalletChainId()).toBeNull()
    expect(isWalletOnSepolia()).toBe(false)
  })
})
