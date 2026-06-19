'use client'

import { useState, useCallback } from 'react'
import { DailyView } from './DailyView'
import { ToDoList } from './ToDoList'
import { MonthlyView } from './MonthlyView'
import { ProjectNotesView } from './ProjectNotesView'
import { MobileBottomNav, type MobileTab } from './MobileBottomNav'
import type { ViewMode } from '@/types'

export function MobileApp() {
  const [activeTab, setActiveTab] = useState<MobileTab>('today')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dailyExpanded, setDailyExpanded] = useState(false)

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
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        backgroundColor: '#006747',
        overflow: 'hidden',
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
            className="todo-card flex flex-col flex-1 min-h-0"
            style={{ borderRadius: '16px' }}
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
            className="todo-card flex flex-col flex-1 min-h-0"
            style={{ borderRadius: '16px' }}
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
            className="todo-card flex flex-col flex-1 min-h-0"
            style={{ borderRadius: '16px' }}
          >
            <MonthlyView selectedDate={selectedDate} navigate={navigate} />
          </div>
        )}

        {activeTab === 'notes' && (
          <div
            className="todo-card flex flex-col flex-1 min-h-0"
            style={{ borderRadius: '16px' }}
          >
            <ProjectNotesView navigate={navigate} />
          </div>
        )}
      </main>

      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
