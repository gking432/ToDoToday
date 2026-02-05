'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Supabase will automatically detect the session in the URL
        // and exchange the code for a session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          // Redirect to home page
          router.push('/')
        } else {
          // If no session, redirect to home (will show login)
          router.push('/')
        }
      } catch (error) {
        console.error('Error handling auth callback:', error)
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
      <div className="text-gray-600">Completing sign in...</div>
    </div>
  )
}
