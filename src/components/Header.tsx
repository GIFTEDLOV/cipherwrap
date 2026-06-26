'use client'

import Link from 'next/link'
import { WalletButton } from './WalletButton'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* Signature element: gradient wordmark */}
          <span className="bg-gradient-to-r from-cipher-400 to-teal-300 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            CipherWrap
          </span>
          <span className="hidden rounded bg-cipher-500/15 px-1.5 py-0.5 text-xs font-mono text-cipher-400 sm:inline">
            Sepolia
          </span>
        </Link>

        <nav className="flex items-center gap-5">
          <Link
            href="/registry"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Registry
          </Link>
          <Link
            href="/demo"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Demo
          </Link>
          <Link
            href="/developers"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Developers
          </Link>
          <Link
            href="/debug/decrypt"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
          >
            Debug
          </Link>
          <WalletButton />
        </nav>
      </div>
    </header>
  )
}
