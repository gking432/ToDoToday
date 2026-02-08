'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getCurrentUser, onAuthStateChange, signInWithGoogle, signOut } from '@/lib/supabase/auth'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  isGuest: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  continueAsGuest: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    // Get initial session
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignIn = async () => {
    await signInWithGoogle()
  }

  const handleSignOut = async () => {
    await signOut()
    setUser(null)
    setIsGuest(false)
  }

  const handleContinueAsGuest = () => {
    setIsGuest(true)
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        signIn: handleSignIn,
        signOut: handleSignOut,
        continueAsGuest: handleContinueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
