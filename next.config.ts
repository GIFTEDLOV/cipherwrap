import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // COOP/COEP enable SharedArrayBuffer — required for multi-threaded WASM
        // in the Zama FHE SDK. credentialless (not require-corp) avoids blocking
        // third-party iframes (e.g. WalletConnect modals) that don't set CORP.
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ]
  },

  webpack: (config, { webpack }) => {
    // @zama-fhe/react-sdk contains a wagmi v3 forward-compat shim that
    // accesses `wagmi.useConnection` via a namespace import. wagmi v2 doesn't
    // export useConnection, and webpack's strict ESM namespace checks throw at
    // link time before the runtime duck-type guard can execute.
    // Fix: redirect the bare `wagmi` import — but ONLY when it comes from
    // within @zama-fhe packages — to a shim that re-exports everything from
    // wagmi plus the missing symbol. The shim itself imports from the real
    // wagmi (different context), so there's no circular redirect.
    // Silence optional peer deps that don't exist in the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }

    // Shim bare `wagmi` import (useConnection)
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^wagmi$/,
        (resource: { context?: string; request: string }) => {
          if (resource.context?.includes('@zama-fhe')) {
            resource.request = path.resolve('./src/lib/wagmiV3Compat.ts')
          }
        },
      ),
    )
    // Shim `wagmi/actions` import (getConnection, watchConnection)
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^wagmi\/actions$/,
        (resource: { context?: string; request: string }) => {
          if (resource.context?.includes('@zama-fhe')) {
            resource.request = path.resolve('./src/lib/wagmiActionsV3Compat.ts')
          }
        },
      ),
    )
    return config
  },
}

export default nextConfig
