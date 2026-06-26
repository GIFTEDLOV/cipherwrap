'use client'

import { usePathname } from 'next/navigation'
import { Starfield } from './Starfield'

export function StarfieldWrapper() {
  const pathname = usePathname()
  return <Starfield intensity={pathname === '/' ? 'full' : 'calm'} />
}
