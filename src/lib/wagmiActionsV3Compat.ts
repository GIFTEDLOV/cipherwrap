// Same wagmi v3 forward-compat issue as wagmiV3Compat.ts but for wagmi/actions.
// wagmi v3 renamed getAccount → getConnection and watchAccount → watchConnection.
// The @zama-fhe/react-sdk shim accesses these as namespace properties which
// fails webpack's strict ESM checks at link time. Add them as shim exports.
export * from 'wagmi/actions'
export { getAccount as getConnection, watchAccount as watchConnection } from 'wagmi/actions'
