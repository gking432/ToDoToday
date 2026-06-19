'use client'

import { Target, ClipboardList, Calendar, PenLine } from 'lucide-react'

export type MobileTab = 'today' | 'todo' | 'calendar' | 'notes'

interface MobileBottomNavProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
}

const tabs: { id: MobileTab; label: string; icon: typeof Target }[] = [
  { id: 'today', label: 'Today', icon: Target },
  { id: 'todo', label: 'To Do', icon: ClipboardList },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: PenLine },
]

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav
      className="flex-shrink-0 flex items-end gap-2 px-3"
      style={{
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        paddingTop: '8px',
      }}
    >
      {tabs.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center justify-center flex-1 transition-all duration-200"
            style={{
              background: '#FFFFFF',
              border: isActive ? 'none' : '1.5px solid #006747',
              borderRadius: '10px',
              padding: isActive ? '10px 8px 12px' : '12px 8px',
              minHeight: isActive ? '72px' : '60px',
              boxShadow: isActive ? '0 2px 12px rgba(0, 40, 25, 0.15)' : 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {isActive && (
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#006747',
                  marginBottom: '4px',
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            )}
            <Icon
              size={isActive ? 22 : 20}
              strokeWidth={1.8}
              color="#006747"
              style={{ flexShrink: 0 }}
            />
            {!isActive && (
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '10px',
                  fontWeight: 500,
                  color: '#006747',
                  marginTop: '4px',
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
