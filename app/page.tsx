'use client'

import { ToDoTodayApp } from '@/components/ToDoTodayApp'
import { LoginScreen } from '@/components/LoginScreen'
import { useAuth } from '@/components/AuthProvider'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <ToDoTodayApp />
}
