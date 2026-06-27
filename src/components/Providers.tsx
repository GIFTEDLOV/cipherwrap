'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ZamaProvider } from '@zama-fhe/react-sdk'
import { useState } from 'react'
import { wagmiConfig } from '@/lib/wagmiConfig'
import { zamaConfig } from '@/lib/zamaConfig'
import { ChainGuardProvider } from '@/components/ChainGuard'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      }),
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ZamaProvider config={zamaConfig}>
          {/* ChainGuardProvider reads chain directly from window.ethereum,
              bypassing wagmi's config-limited chain detection */}
          <ChainGuardProvider>
            {children}
          </ChainGuardProvider>
        </ZamaProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
