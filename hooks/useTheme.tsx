'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const INVERTED_KEY = 'todoToday_invertedTheme'

export type ThemeColors = {
  bg: string
  surface: string
  primary: string
  heading: string
  text: string
  muted: string
  mutedBg: string
  surfaceAlt: string
  border: string
  navBg: string
  navText: string
  navBorder: string
  welcomeTitle: string
  welcomeDate: string
  yellow: string
  pink: string
  shadow: string
}

const defaultColors: ThemeColors = {
  bg: '#006747',
  surface: '#FFFFFF',
  primary: '#006747',
  heading: '#006747',
  text: '#1A2E1A',
  muted: '#5A7A5E',
  mutedBg: '#E8EFE6',
  surfaceAlt: '#F5F9F7',
  border: '#E8EFE6',
  navBg: '#FFFFFF',
  navText: '#006747',
  navBorder: '#006747',
  welcomeTitle: '#FFDF00',
  welcomeDate: '#E8EFE6',
  yellow: '#FFDF00',
  pink: '#F78FB3',
  shadow: '0 4px 24px rgba(0, 40, 25, 0.18)',
}

const invertedColors: ThemeColors = {
  bg: '#FFFFFF',
  surface: '#006747',
  primary: '#006747',
  heading: '#FFFFFF',
  text: '#E8EFE6',
  muted: '#C8D5C2',
  mutedBg: '#005a3c',
  surfaceAlt: '#005a3c',
  border: 'rgba(255, 255, 255, 0.2)',
  navBg: '#006747',
  navText: '#FFFFFF',
  navBorder: '#FFFFFF',
  welcomeTitle: '#006747',
  welcomeDate: '#5A7A5E',
  yellow: '#FFDF00',
  pink: '#F78FB3',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
}

interface ThemeContextType {
  inverted: boolean
  colors: ThemeColors
  setInverted: (value: boolean) => void
  toggleInverted: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [inverted, setInvertedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INVERTED_KEY)
      if (stored === 'true') setInvertedState(true)
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.setAttribute('data-theme', inverted ? 'inverted' : 'default')
    try {
      localStorage.setItem(INVERTED_KEY, String(inverted))
    } catch {
      // ignore
    }
  }, [inverted, hydrated])

  const setInverted = useCallback((value: boolean) => {
    setInvertedState(value)
  }, [])

  const toggleInverted = useCallback(() => {
    setInvertedState((prev) => !prev)
  }, [])

  const colors = inverted ? invertedColors : defaultColors

  return (
    <ThemeContext.Provider value={{ inverted, colors, setInverted, toggleInverted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
