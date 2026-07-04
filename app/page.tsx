'use client'

import { MobileApp } from '@/components/MobileApp'
import { ToDoTodayApp } from '@/components/ToDoTodayApp'
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout'

export default function Home() {
  const layout = useResponsiveLayout()

  if (layout === null) {
    return null
  }

  return layout === 'mobile' ? <MobileApp /> : <ToDoTodayApp />
}
