import { createConfig } from '@zama-fhe/react-sdk/wagmi'
import { sepolia as zamaSepolia } from '@zama-fhe/sdk/chains'
import { web } from '@zama-fhe/sdk/web'
import { wagmiConfig } from './wagmiConfig'

export const zamaConfig = createConfig({
  chains: [zamaSepolia],
  relayers: {
    [zamaSepolia.id]: web(),
  },
  wagmiConfig,
})
