'use client'

import { useEffect, useState } from 'react'

/** Landscape tablets (e.g. iPad) are ~1024px wide; phones stay mobile even in landscape. */
export const DESKTOP_MIN_WIDTH = 1024

export type AppLayout = 'mobile' | 'desktop'

function computeLayout(): AppLayout {
  if (typeof window === 'undefined') return 'mobile'
  const width = window.innerWidth
  const height = window.innerHeight
  const portrait = height > width
  if (portrait || width < DESKTOP_MIN_WIDTH) return 'mobile'
  return 'desktop'
}

export function useResponsiveLayout(): AppLayout | null {
  const [layout, setLayout] = useState<AppLayout | null>(null)

  useEffect(() => {
    const update = () => setLayout(computeLayout())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return layout
}
