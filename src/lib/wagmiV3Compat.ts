// @zama-fhe/react-sdk has a wagmi v3 forward-compatibility shim that
// accesses wagmi.useConnection at module-load time. wagmi v2 does not export
// it, and webpack's strict ESM namespace checks throw before the runtime
// duck-type guard can run. This shim re-exports all of wagmi plus the missing
// symbol so webpack's static analysis is satisfied.
export * from 'wagmi'
export { useAccount as useConnection } from 'wagmi'
