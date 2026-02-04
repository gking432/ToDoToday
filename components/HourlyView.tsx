'use client'

import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import type { ViewMode } from '@/types'

interface HourlyViewProps {
  date: Date
  navigate: (view: ViewMode, date?: Date) => void
}

export function HourlyView({ date, navigate }: HourlyViewProps) {
  const store = useStore()
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const dateStr = formatDate(date)

  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6 AM – 11 PM

  const getEventsForSlot = (hour: number) => {
    return store.events.filter((event) => event.date === dateStr && event.hour === hour)
  }

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(hour)
  }

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    setDragOverSlot(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = store.tasks.find((t) => t.id === taskId)
    if (!task) return

    // Create an event from the task
    store.addEvent(task.text, dateStr, hour, task.id)
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const removeEventFromSlot = (eventId: string) => {
    store.deleteEvent(eventId)
  }

  const formatHour = (hour: number) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${h}:00 ${ampm}`
  }

  return (
    <div className="flex flex-col h-full">
      {/* Green header */}
      <div className="card-header flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('daily')}
            className="flex items-center gap-1.5 transition-colors duration-200"
            style={{
              color: 'rgba(255,255,255,0.6)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '12px',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.95)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <div
            style={{
              width: '1px',
              height: '16px',
              backgroundColor: 'rgba(255,255,255,0.25)',
            }}
          />

          <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>
            {format(date, 'EEEE, MMMM d')}
          </h1>
        </div>
      </div>

      {/* White body — hourly slots */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {hours.map((hour) => {
            const events = getEventsForSlot(hour)
            const isDragOver = dragOverSlot === hour

            return (
              <div
                key={hour}
                onDragOver={(e) => handleDragOver(e, hour)}
                onDrop={(e) => handleDrop(e, hour)}
                onDragLeave={handleDragLeave}
                className="flex items-start gap-3 transition-all duration-150"
                style={{
                  minHeight: '52px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  backgroundColor: isDragOver ? '#FFF8D6' : '#F5F9F7',
                  border: isDragOver ? '2px dashed #FFD700' : '2px solid transparent',
                }}
              >
                {/* Time label */}
                <div
                  className="flex-shrink-0"
                  style={{
                    width: '64px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#5A7A5E',
                    paddingTop: '2px',
                  }}
                >
                  {formatHour(hour)}
                </div>

                {/* Events or drop hint */}
                <div className="flex-1 min-w-0">
                  {events.length === 0 ? (
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        color: isDragOver ? '#9A7B0A' : '#C8D5C2',
                        fontStyle: 'italic',
                        paddingTop: '2px',
                      }}
                    >
                      {isDragOver ? 'Drop here' : 'Drop a task here'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between gap-2"
                          style={{
                            padding: '5px 10px',
                            borderRadius: '7px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E8EFE6',
                            boxShadow: '0 1px 2px rgba(0,40,25,0.06)',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '12px',
                              color: '#1A2E1A',
                            }}
                          >
                            {event.text}
                          </span>
                          <button
                            onClick={() => removeEventFromSlot(event.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#C8D5C2',
                              padding: 0,
                              display: 'flex',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#F78FB3')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#C8D5C2')}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}