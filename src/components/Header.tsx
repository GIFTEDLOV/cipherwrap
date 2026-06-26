'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletButton } from './WalletButton'

const NAV = [
  { href: '/',           label: 'Home' },
  { href: '/registry',   label: 'Registry' },
  { href: '/demo',       label: 'Demo' },
  { href: '/developers', label: 'Developers' },
]

export function Header() {
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(4, 9, 21, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottomColor: 'rgba(59, 130, 246, 0.12)',
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">

        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5 transition-opacity hover:opacity-75">
          {/* Hexagonal mark */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
              border: '1px solid rgba(99,102,241,0.35)',
              color: '#a5b4fc',
            }}
          >
            ⬡
          </div>
          <span
            className="font-display text-lg font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 55%, #7dd3fc 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            CipherWrap
          </span>
          <span
            className="hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold sm:inline"
            style={{
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              color: '#93c5fd',
            }}
          >
            Sepolia
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-1.5 text-sm transition-colors"
                style={{
                  color: active ? '#93c5fd' : '#94a3b8',
                  background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (!active) (e.target as HTMLElement).style.color = '#e2e8f0'
                }}
                onMouseLeave={e => {
                  if (!active) (e.target as HTMLElement).style.color = '#94a3b8'
                }}
              >
                {label}
              </Link>
            )
          })}
          <div className="ml-2">
            <WalletButton />
          </div>
        </nav>

      </div>
    </header>
  )
}
