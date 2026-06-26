'use client'

import { useEffect, useRef } from 'react'

export type StarfieldIntensity = 'full' | 'calm'

interface Star {
  x: number
  y: number
  r: number
  opacity: number
  speed: number
  phase: number
  rate: number
}

function makeStar(w: number, h: number, intensity: StarfieldIntensity): Star {
  const full = intensity === 'full'
  return {
    x:       Math.random() * w,
    y:       Math.random() * h,
    r:       Math.random() * (full ? 0.9 : 0.65) + (full ? 0.3 : 0.2),
    opacity: Math.random() * (full ? 0.45 : 0.22) + (full ? 0.30 : 0.08),
    speed:   Math.random() * (full ? 0.35 : 0.15) + (full ? 0.25 : 0.07),
    phase:   Math.random() * Math.PI * 2,
    rate:    Math.random() * 0.007 + 0.002,
  }
}

export function Starfield({ intensity = 'full' }: { intensity?: StarfieldIntensity }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const count = intensity === 'full' ? 220 : 100

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h

    const stars: Star[] = Array.from({ length: count }, () => makeStar(w, h, intensity))

    let rafId: number

    function draw() {
      ctx!.clearRect(0, 0, w, h)

      for (const s of stars) {
        // Always move — even under reduced-motion we use 10% speed (barely perceptible)
        const effectiveSpeed = prefersReduced ? s.speed * 0.1 : s.speed
        s.y -= effectiveSpeed
        if (s.y + s.r < 0) {
          s.y = h + s.r
          s.x = Math.random() * w
        }

        s.phase += prefersReduced ? 0 : s.rate

        const twinkle = prefersReduced
          ? s.opacity
          : s.opacity + Math.sin(s.phase) * 0.13

        const alpha = Math.max(0.03, Math.min(0.88, twinkle))

        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(190, 215, 255, ${alpha})`
        ctx!.fill()
      }

      rafId = requestAnimationFrame(draw)
    }

    draw()

    const onResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
    }
    window.addEventListener('resize', onResize, { passive: true })

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
    }
  }, [count, intensity])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  )
}
