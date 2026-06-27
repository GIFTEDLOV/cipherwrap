import { createConfig } from '@zama-fhe/react-sdk/wagmi'
import { sepolia as zamaSepolia } from '@zama-fhe/sdk/chains'
import { web } from '@zama-fhe/sdk/web'
import { wagmiConfig } from './wagmiConfig'

// Route all Zama relayer requests through our same-origin proxy so the SDK
// worker can fetch large FHE artifacts (public params, public key) without
// hitting cross-origin credentialed-request restrictions in the browser.
// On the server (SSR), window is undefined — fall back to the direct URL;
// the SDK never actually runs during SSR so this path is never used.
const relayerUrl =
  typeof window !== 'undefined'
    ? `${window.location.origin}/api/zama-relay`
    : zamaSepolia.relayerUrl

const sepoliaChain = { ...zamaSepolia, relayerUrl }

export const zamaConfig = createConfig({
  chains: [sepoliaChain],
  relayers: {
    [sepoliaChain.id]: web(),
  },
  wagmiConfig,
})
