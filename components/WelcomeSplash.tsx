'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useTheme } from '@/hooks/useTheme'

interface WelcomeSplashProps {
  onComplete: () => void
}

export function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  const { colors } = useTheme()
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')
  const now = new Date()

  useEffect(() => {
    const exitTimer = setTimeout(() => setPhase('exit'), 2200)
    const doneTimer = setTimeout(() => onComplete(), 3000)
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        backgroundColor: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: phase === 'enter' ? 'fullScreenFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : 'welcomeFadeOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '72px',
          fontWeight: 600,
          fontStyle: 'italic',
          color: colors.welcomeTitle,
          textAlign: 'center',
          lineHeight: 1,
        }}
      >
        Welcome
      </div>
      <div
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '28px',
          fontWeight: 500,
          color: colors.heading,
          textAlign: 'center',
          marginTop: '12px',
        }}
      >
        {format(now, 'EEEE')}
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '18px',
          fontWeight: 400,
          color: colors.welcomeDate,
          textAlign: 'center',
          marginTop: '8px',
          fontStyle: 'italic',
        }}
      >
        {format(now, 'MMMM d, yyyy')}
      </div>
    </div>
  )
}
