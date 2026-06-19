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

  const settingsButton = (
    <button
      type="button"
      className="mobile-settings-btn"
      onClick={() => setShowSettings(true)}
      aria-label="Settings"
      style={{ color: colors.muted }}
    >
      <Settings size={20} strokeWidth={1.8} />
    </button>
  )

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
          className="flex-1 min-h-0 flex flex-col"
          style={{
            padding: '12px 12px 0',
            paddingTop: 'max(12px, env(safe-area-inset-top))',
          }}
        >
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
                headerAction={settingsButton}
              />
            </div>
          )}

          {activeTab === 'todo' && (
            <div
              className="todo-card themed-content flex flex-col flex-1 min-h-0"
              style={{ borderRadius: '16px', boxShadow: colors.shadow }}
            >
              <ToDoList />
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
