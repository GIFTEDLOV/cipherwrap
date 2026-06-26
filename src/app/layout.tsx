import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Header } from '@/components/Header'
import { StarfieldWrapper } from '@/components/StarfieldWrapper'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CipherWrap — Confidential Token Registry',
  description:
    'Discover, wrap, unwrap, and test Zama confidential tokens on Sepolia. Live registry reads, real EIP-712 decryption, honest two-phase unwrap.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen bg-space-950 font-sans text-slate-100 antialiased">
        <Providers>
          <StarfieldWrapper />
          <Header />
          <main className="relative z-10">{children}</main>
        </Providers>
      </body>
    </html>
  )
}
