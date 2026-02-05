'use client'

import { Home, Calendar, BookOpen, LogOut } from 'lucide-react'
import type { ViewMode } from '@/types'
import { useAuth } from './AuthProvider'

interface NavigationProps {
  activeView: ViewMode
  selectedDate: Date
  navigate: (view: ViewMode, date?: Date) => void
}

export function Navigation({ activeView, selectedDate, navigate }: NavigationProps) {
  const { signOut } = useAuth()
  const isToday =
    activeView === 'daily' &&
    selectedDate.toDateString() === new Date().toDateString()

  const navItems = [
    {
      id: 'daily' as const,
      label: 'Today',
      icon: Home,
      active: isToday || activeView === 'daily',
      onClick: () => navigate('daily', new Date()),
    },
    {
      id: 'monthly' as const,
      label: 'Month',
      icon: Calendar,
      active: activeView === 'monthly',
      onClick: () => navigate('monthly'),
    },
    {
      id: 'project-notes' as const,
      label: 'Projects',
      icon: BookOpen,
      active: activeView === 'project-notes',
      onClick: () => navigate('project-notes'),
    },
  ]

  return (
    <div
      className="flex-shrink-0 flex items-center justify-between gap-1 px-5"
      style={{
        height: '52px',
        backgroundColor: '#006747',
      }}
    >
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200"
              style={{
                backgroundColor: item.active ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: item.active ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: item.active ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!item.active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={(e) => {
                if (!item.active) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Icon size={14} strokeWidth={item.active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      
      <button
        onClick={signOut}
        className="relative flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200"
        style={{
          backgroundColor: 'transparent',
          color: 'rgba(255,255,255,0.6)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '13px',
          fontWeight: 400,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'
          e.currentTarget.style.color = '#FFFFFF'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.6)'
        }}
        title="Sign out"
      >
        <LogOut size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}