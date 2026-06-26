import { createConfig, fallback, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Primary RPC — set NEXT_PUBLIC_SEPOLIA_RPC_URL (Alchemy/Infura) for reliability.
// Without it, the app falls back to two free public endpoints.
const userRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL

// Each endpoint gets 3 fast retries (150 ms apart) before the fallback
// transport moves to the next URL in the list.
function reliableHttp(url: string) {
  return http(url, { retryCount: 3, retryDelay: 150 })
}

const sepoliaRpcs = [
  ...(userRpc ? [reliableHttp(userRpc)] : []),
  reliableHttp('https://ethereum-sepolia-rpc.publicnode.com'),
  reliableHttp('https://rpc.ankr.com/eth_sepolia'),
]

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: fallback(sepoliaRpcs),
  },
  ssr: true,
})
