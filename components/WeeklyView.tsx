'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, X, Trash2 } from 'lucide-react'
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
} from 'date-fns'
import { useStore } from '@/hooks/useStore'
import { useTheme } from '@/hooks/useTheme'
import {
  formatDate,
  getTasksForDate as getTasksForDateUtil,
  getEventsForDate as getEventsForDateUtil,
} from '@/lib/utils'
import type { ViewMode, Event, Task } from '@/types'
import { RecurringDeleteModal } from './RecurringDeleteModal'

interface WeeklyViewProps {
  selectedDate: Date
  navigate: (view: ViewMode, date?: Date) => void
}

function formatHour(hour: number, minutes: number = 0) {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const mins = minutes.toString().padStart(2, '0')
  return `${h}:${mins} ${ampm}`
}

function formatTimeRange(
  startHour: number,
  endHour?: number,
  startMinutes?: number,
  endMinutes?: number
) {
  const startMins = startMinutes ?? 0
  const endMins = endMinutes ?? 0
  if (endHour !== undefined && (endHour !== startHour || endMins !== startMins)) {
    return `${formatHour(startHour, startMins)} – ${formatHour(endHour, endMins)}`
  }
  return formatHour(startHour, startMins)
}

export function WeeklyView({ selectedDate, navigate }: WeeklyViewProps) {
  const store = useStore()
  const { colors } = useTheme()
  const [currentWeek, setCurrentWeek] = useState(selectedDate)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventFormDate, setEventFormDate] = useState<Date | null>(null)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [eventFormData, setEventFormData] = useState({
    title: '',
    startHour: 9,
    endHour: 10,
    location: '',
    allDay: false,
  })

  const todayStr = formatDate(new Date())

  useEffect(() => {
    setCurrentWeek(selectedDate)
  }, [selectedDate])

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const getTasksForDay = (date: Date): Task[] => {
    const dateStr = formatDate(date)
    const isPastDate = dateStr < todayStr

    const tasksForDate = getTasksForDateUtil(store.tasks, date).filter((task) => {
      if (task.parentTaskId) return true
      if (isPastDate) return true
      return !task.completed
    })

    if (dateStr === todayStr) {
      const overdueTasks = store.tasks.filter(
        (task) =>
          !task.completed &&
          !task.parentTaskId &&
          !task.recurrence &&
          task.dueDate &&
          task.dueDate < todayStr &&
          !tasksForDate.some((t) => t.id === task.id)
      )
      return [...tasksForDate, ...overdueTasks]
    }

    return tasksForDate
  }

  const getEventsForDay = (date: Date) => {
    return getEventsForDateUtil<Event>(store.events, date).sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return a.hour - b.hour
    })
  }

  const toggleDay = (dateStr: string, hasItems: boolean) => {
    if (!hasItems) return
    setExpandedDate((prev) => (prev === dateStr ? null : dateStr))
  }

  const openEventForm = (date: Date) => {
    setEventFormDate(date)
    setEventFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
    setShowEventForm(true)
  }

  const handleCreateEvent = () => {
    if (!eventFormData.title.trim() || !eventFormDate) return
    store.addEvent(
      eventFormData.title.trim(),
      formatDate(eventFormDate),
      eventFormData.startHour,
      undefined,
      eventFormData.endHour,
      eventFormData.location.trim() || undefined,
      undefined,
      undefined,
      eventFormData.allDay
    )
    setShowEventForm(false)
    setEventFormDate(null)
    setExpandedDate(formatDate(eventFormDate))
  }

  const hourOptions = Array.from({ length: 18 }, (_, i) => i + 6)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="card-header flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            aria-label="Previous week"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.heading,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: colors.heading }}>
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            aria-label="Next week"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.heading,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        {!isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 0 })) && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                setCurrentWeek(now)
                setExpandedDate(formatDate(now))
              }}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: colors.heading,
                background: colors.mutedBg,
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              This week
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: '12px 14px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {days.map((day) => {
            const dateStr = formatDate(day)
            const dayIsToday = isToday(day)
            const tasks = getTasksForDay(day)
            const events = getEventsForDay(day)
            const itemCount = tasks.length + events.length
            const hasItems = itemCount > 0
            const isExpanded = expandedDate === dateStr

            return (
              <div
                key={dateStr}
                style={{
                  borderRadius: '12px',
                  border: `1px solid ${dayIsToday ? colors.yellow : colors.border}`,
                  backgroundColor: dayIsToday ? `${colors.yellow}22` : colors.surfaceAlt,
                  overflow: 'hidden',
                  boxShadow: dayIsToday ? `inset 3px 0 0 ${colors.yellow}` : 'none',
                }}
              >
                <div
                  role={hasItems ? 'button' : undefined}
                  tabIndex={hasItems ? 0 : undefined}
                  onClick={() => hasItems && toggleDay(dateStr, hasItems)}
                  onKeyDown={(e) => {
                    if (hasItems && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      toggleDay(dateStr, hasItems)
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    cursor: hasItems ? 'pointer' : 'default',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '16px',
                        fontWeight: dayIsToday ? 700 : 600,
                        color: colors.heading,
                        lineHeight: 1.2,
                      }}
                    >
                      {format(day, 'EEEE')}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '12px',
                        color: colors.muted,
                        marginTop: '2px',
                        fontStyle: 'italic',
                      }}
                    >
                      {format(day, 'MMMM d')}
                      {dayIsToday && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontStyle: 'normal',
                            fontWeight: 600,
                            color: colors.heading,
                            fontSize: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          Today
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasItems && (
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '11px',
                          fontWeight: 600,
                          color: colors.muted,
                          backgroundColor: colors.mutedBg,
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        {itemCount}
                      </span>
                    )}
                    {hasItems &&
                      (isExpanded ? (
                        <ChevronUp size={16} color={colors.muted} />
                      ) : (
                        <ChevronDown size={16} color={colors.muted} />
                      ))}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEventForm(day)
                      }}
                      aria-label={`Add event on ${format(day, 'MMMM d')}`}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: colors.mutedBg,
                        color: colors.heading,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {isExpanded && hasItems && (
                  <div
                    style={{
                      padding: '0 14px 14px',
                      borderTop: `1px solid ${colors.border}`,
                    }}
                  >
                    {events.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '10px',
                            fontWeight: 600,
                            color: colors.muted,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: '8px',
                          }}
                        >
                          Events
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {events.map((event) => (
                            <div
                              key={`${event.parentEventId || event.id}-${event.date}`}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                backgroundColor: colors.surface,
                                border: `1px solid ${colors.border}`,
                              }}
                            >
                              <div className="min-w-0">
                                <div
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: colors.text,
                                  }}
                                >
                                  {event.text}
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '11px',
                                    color: colors.muted,
                                    marginTop: '2px',
                                  }}
                                >
                                  {event.allDay
                                    ? 'All day'
                                    : formatTimeRange(
                                        event.hour,
                                        event.endHour,
                                        event.minutes,
                                        event.endMinutes
                                      )}
                                  {event.location ? ` · ${event.location}` : ''}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setEventToDelete(event)}
                                aria-label="Delete event"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: colors.muted,
                                  padding: '2px',
                                  flexShrink: 0,
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tasks.length > 0 && (
                      <div style={{ marginTop: events.length > 0 ? '14px' : '12px' }}>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '10px',
                            fontWeight: 600,
                            color: colors.muted,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            marginBottom: '8px',
                          }}
                        >
                          Due
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {tasks.map((task) => (
                            <div
                              key={`${task.id}-${task.dueDate}`}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '10px',
                                backgroundColor: colors.surface,
                                border: `1px solid ${colors.border}`,
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '13px',
                                color: task.completed ? colors.muted : colors.text,
                                textDecoration: task.completed ? 'line-through' : 'none',
                              }}
                            >
                              {task.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate('daily', day)}
                      style={{
                        marginTop: '12px',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        color: colors.muted,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px',
                      }}
                    >
                      View full day
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showEventForm && eventFormDate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowEventForm(false)}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              borderRadius: '16px',
              padding: '20px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: colors.shadow,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: colors.heading,
                  margin: 0,
                }}
              >
                New event
              </h2>
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.muted }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                color: colors.muted,
                marginBottom: '14px',
                fontStyle: 'italic',
              }}
            >
              {format(eventFormDate, 'EEEE, MMMM d')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                value={eventFormData.title}
                onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                placeholder="Event title"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: colors.text,
                  backgroundColor: colors.surfaceAlt,
                  outline: 'none',
                }}
              />

              <label className="flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: colors.muted }}>
                <input
                  type="checkbox"
                  checked={eventFormData.allDay}
                  onChange={(e) => setEventFormData({ ...eventFormData, allDay: e.target.checked })}
                />
                All day
              </label>

              {!eventFormData.allDay && (
                <div className="flex gap-3">
                  <select
                    value={eventFormData.startHour}
                    onChange={(e) =>
                      setEventFormData({ ...eventFormData, startHour: parseInt(e.target.value) })
                    }
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: colors.text,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={eventFormData.endHour}
                    onChange={(e) =>
                      setEventFormData({ ...eventFormData, endHour: parseInt(e.target.value) })
                    }
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: colors.text,
                      backgroundColor: colors.surfaceAlt,
                    }}
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>
                        {formatHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <input
                type="text"
                value={eventFormData.location}
                onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                placeholder="Location (optional)"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  color: colors.text,
                  backgroundColor: colors.surfaceAlt,
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={handleCreateEvent}
                disabled={!eventFormData.title.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: eventFormData.title.trim() ? colors.primary : colors.mutedBg,
                  color: '#FFFFFF',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: eventFormData.title.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Add event
              </button>
            </div>
          </div>
        </div>
      )}

      {eventToDelete && (
        <RecurringDeleteModal
          open={!!eventToDelete}
          variant="event"
          isRecurring={
            !!(
              eventToDelete &&
              store.events.find((e) => e.id === (eventToDelete.parentEventId || eventToDelete.id))?.recurrence
            )
          }
          onCancel={() => setEventToDelete(null)}
          onDeleteSeries={() => {
            store.deleteEvent(eventToDelete.parentEventId || eventToDelete.id)
            setEventToDelete(null)
          }}
          onDeleteSingle={() => {
            store.deleteEvent(
              eventToDelete.parentEventId || eventToDelete.id,
              eventToDelete.date
            )
            setEventToDelete(null)
          }}
          onDeletePlain={() => {
            store.deleteEvent(eventToDelete.parentEventId || eventToDelete.id)
            setEventToDelete(null)
          }}
        />
      )}
    </div>
  )
}
