'use client'

import { useState, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { DailyView } from './DailyView'
import { ToDoList } from './ToDoList'
import { MonthlyView } from './MonthlyView'
import { ProjectNotesView } from './ProjectNotesView'
import { MobileBottomNav, type MobileTab } from './MobileBottomNav'
import { WelcomeSplash } from './WelcomeSplash'
import { SettingsPanel } from './SettingsPanel'
import { useTheme } from '@/hooks/useTheme'
import type { ViewMode } from '@/types'

export function MobileApp() {
  const { colors } = useTheme()
  const [activeTab, setActiveTab] = useState<MobileTab>('today')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dailyExpanded, setDailyExpanded] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  const navigate = useCallback((view: ViewMode, date?: Date) => {
    if (date) setSelectedDate(date)
    if (view === 'daily') {
      setActiveTab('today')
      setDailyExpanded(false)
    } else if (view === 'monthly') {
      setActiveTab('calendar')
    } else if (view === 'project-notes') {
      setActiveTab('notes')
    }
  }, [])

  return (
    <>
      {showWelcome && <WelcomeSplash onComplete={() => setShowWelcome(false)} />}

      <div
        className="mobile-app flex flex-col"
        style={{
          height: '100dvh',
          backgroundColor: colors.bg,
          overflow: 'hidden',
          opacity: showWelcome ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
      >
        <main
          className="flex-1 min-h-0 flex flex-col relative"
          style={{
            padding: '12px 12px 0',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
          }}
        >
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            aria-label="Settings"
            style={{
              position: 'absolute',
              top: 'max(12px, env(safe-area-inset-top))',
              right: '12px',
              zIndex: 10,
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: `1.5px solid ${colors.navBorder}`,
              background: colors.navBg,
              color: colors.navText,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 40, 25, 0.12)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Settings size={18} strokeWidth={1.8} />
          </button>

          {activeTab === 'today' && (
            <div
              className="todo-card themed-content flex flex-col flex-1 min-h-0"
              style={{ borderRadius: '16px', boxShadow: colors.shadow }}
            >
              <DailyView
                date={selectedDate}
                navigate={navigate}
                isExpanded={dailyExpanded}
                onExpand={() => setDailyExpanded(true)}
                onCollapse={() => setDailyExpanded(false)}
                eventsReadOnly
              />
            </div>
          )}

          {activeTab === 'todo' && (
            <div
              className="todo-card themed-content flex flex-col flex-1 min-h-0"
              style={{ borderRadius: '16px', boxShadow: colors.shadow }}
            >
              <div className="card-header flex-shrink-0">
                <h1 style={{ fontSize: '22px', fontWeight: 600 }}>To Do</h1>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ToDoList />
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div
              className="todo-card themed-content flex flex-col flex-1 min-h-0"
              style={{ borderRadius: '16px', boxShadow: colors.shadow }}
            >
              <MonthlyView selectedDate={selectedDate} navigate={navigate} />
            </div>
          )}

          {activeTab === 'notes' && (
            <div
              className="todo-card themed-content flex flex-col flex-1 min-h-0"
              style={{ borderRadius: '16px', boxShadow: colors.shadow }}
            >
              <ProjectNotesView navigate={navigate} />
            </div>
          )}
        </main>

        <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  )
}
