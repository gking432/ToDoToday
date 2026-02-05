'use client'

import { supabase } from './client'
import type { User } from '@supabase/supabase-js'

export async function signInWithGoogle() {
  const getRedirectUrl = () => {
    if (typeof window === 'undefined') return undefined
    
    // Detect base path from current URL
    const pathname = window.location.pathname
    const basePath = pathname.startsWith('/ToDoToday') ? '/ToDoToday' : ''
    return `${window.location.origin}${basePath}/auth/callback`
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getRedirectUrl()
    }
  })
  
  if (error) {
    throw error
  }
  
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null)
  })
  return { data: { subscription } }
}
