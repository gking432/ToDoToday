'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, X, Repeat } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate, getEventsForDate } from '@/lib/utils'
import type { Event, RecurrencePattern } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { CalendarPopup } from './CalendarPopup'
import { RecurringDeleteModal } from './RecurringDeleteModal'

interface DailyEventsProps {
  date: Date
  readOnly?: boolean
}

export function DailyEvents({ date, readOnly = false }: DailyEventsProps) {
  const store = useStore()
  const { colors } = useTheme()
  const dateStr = formatDate(date)
  const [showForm, setShowForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const [showRecurrencePopup, setShowRecurrencePopup] = useState(false)
  const [formData, setFormData] = useState<{
    title: string
    startHour: number
    endHour: number
    location: string
    allDay: boolean
    recurrence: RecurrencePattern | null
  }>({
    title: '',
    startHour: 9,
    endHour: 10,
    location: '',
    allDay: false,
    recurrence: null,
  })

  // Get all events for this date (including recurring)
  const eventsForDate = getEventsForDate<Event>(store.events, date)
  
  const events = eventsForDate.sort((a, b) => {
    // All-day events first, then sort by hour
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    if (a.allDay && b.allDay) return 0
    return a.hour - b.hour
  })

  const formatHour = (hour: number, minutes: number = 0) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const mins = minutes.toString().padStart(2, '0')
    return `${h}:${mins} ${ampm}`
  }

  const formatTimeRange = (startHour: number, endHour?: number, startMinutes?: number, endMinutes?: number) => {
    const startMins = startMinutes ?? 0
    const endMins = endMinutes ?? 0
    if (endHour && (endHour !== startHour || endMins !== startMins)) {
      return `${formatHour(startHour, startMins)} - ${formatHour(endHour, endMins)}`
    }
    return formatHour(startHour, startMins)
  }

  const handleAddEvent = () => {
    if (!formData.title.trim()) return
    
    store.addEvent(
      formData.title.trim(),
      dateStr,
      formData.startHour,
      undefined, // sourceTaskId
      formData.endHour,
      formData.location.trim() || undefined,
      undefined, // minutes
      undefined, // endMinutes
      formData.allDay,
      formData.recurrence
    )
    
    // Reset form
    setFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
      recurrence: null,
    })
    setShowForm(false)
  }

  const handleEditEvent = (event: Event) => {
    const seriesId = event.parentEventId || event.id
    const series = store.events.find((e) => e.id === seriesId)
    setEditingEventId(seriesId)
    setFormData({
      title: series?.text ?? event.text,
      startHour: series?.hour ?? event.hour,
      endHour: series
        ? (series.endHour ?? series.hour + 1)
        : (event.endHour || event.hour + 1),
      location: series?.location || event.location || '',
      allDay: series?.allDay ?? event.allDay ?? false,
      recurrence: series?.recurrence ?? null,
    })
    setShowForm(false)
  }

  const handleUpdateEvent = () => {
    if (!formData.title.trim() || !editingEventId) return
    
    store.updateEvent(editingEventId, {
      text: formData.title.trim(),
      hour: formData.allDay ? 0 : formData.startHour,
      endHour: formData.allDay ? undefined : formData.endHour,
      location: formData.location.trim() || undefined,
      allDay: formData.allDay,
      recurrence: formData.recurrence,
    })
    
    // Reset form
    setEditingEventId(null)
    setFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
      recurrence: null,
    })
  }

  const handleRequestDeleteEvent = (event: Event) => {
    setEventToDelete(event)
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
    setFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
      recurrence: null,
    })
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div className="mb-3">
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '10px',
            fontWeight: 600,
            color: colors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Events
        </span>
      </div>

      {!readOnly && (showForm || editingEventId) ? (
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: colors.surfaceAlt,
            border: `1px solid ${colors.border}`,
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: colors.muted,
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Event title"
                autoFocus
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E8EFE6',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#1A2E1A',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    editingEventId ? handleUpdateEvent() : handleAddEvent()
                  } else if (e.key === 'Escape') {
                    editingEventId ? handleCancelEdit() : setShowForm(false)
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                id="allDay"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="allDay"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: colors.muted,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                All Day / No Timeslot
              </label>
            </div>

            {!formData.allDay && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      color: colors.muted,
                      fontWeight: 500,
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    Start Time
                  </label>
                  <select
                    value={formData.startHour}
                    onChange={(e) => setFormData({ ...formData, startHour: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E8EFE6',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: colors.text,
                      outline: 'none',
                    }}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => (
                      <option key={hour} value={hour}>
                        {formatHour(hour)}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      color: colors.muted,
                      fontWeight: 500,
                      display: 'block',
                      marginBottom: '4px',
                    }}
                  >
                    End Time
                  </label>
                  <select
                    value={formData.endHour}
                    onChange={(e) => setFormData({ ...formData, endHour: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #E8EFE6',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: colors.text,
                      outline: 'none',
                    }}
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => (
                      <option key={hour} value={hour}>
                        {formatHour(hour)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: colors.muted,
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Location (optional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Location"
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E8EFE6',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  color: '#1A2E1A',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowRecurrencePopup(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E8EFE6',
                  backgroundColor: '#FFFFFF',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: '#006747',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <Repeat size={14} />
                {formData.recurrence ? 'Edit repeat' : 'Repeat'}
              </button>
              {formData.recurrence && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, recurrence: null })}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'none',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: colors.muted,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Clear repeat
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={editingEventId ? handleCancelEdit : () => setShowForm(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E8EFE6',
                  backgroundColor: 'transparent',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: colors.muted,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={editingEventId ? handleUpdateEvent : handleAddEvent}
                disabled={!formData.title.trim()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: formData.title.trim() ? '#006747' : '#C8D5C2',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: '#FFFFFF',
                  cursor: formData.title.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                }}
              >
                {editingEventId ? 'Update Event' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: colors.muted,
              fontStyle: 'italic',
            }}
          >
            No events
          </div>
          {!readOnly && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              color: colors.muted,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
              textDecoration: 'underline',
              textDecorationColor: 'rgba(90, 122, 94, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#006747'
              e.currentTarget.style.textDecorationColor = '#006747'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#5A7A5E'
              e.currentTarget.style.textDecorationColor = 'rgba(90, 122, 94, 0.3)'
            }}
          >
            + Create an Event
          </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((event) => {
            const series = store.events.find((e) => e.id === (event.parentEventId || event.id))
            const isSeriesRecurring = !!series?.recurrence
            return (
            <div
              key={`${event.parentEventId || event.id}-${event.date}`}
              className="flex items-start gap-3"
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: colors.surfaceAlt,
                border: `1px solid ${colors.border}`,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                const buttons = e.currentTarget.querySelector('[data-event-buttons]') as HTMLElement
                if (buttons) buttons.style.opacity = '1'
              }}
              onMouseLeave={(e) => {
                const buttons = e.currentTarget.querySelector('[data-event-buttons]') as HTMLElement
                if (buttons) buttons.style.opacity = '0'
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: colors.text,
                    lineHeight: '1.4',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  {event.text}
                </div>
                {isSeriesRecurring && (
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '10px',
                      color: '#006747',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                  >
                    Repeats
                  </div>
                )}
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: colors.muted,
                    marginBottom: event.location ? '4px' : '0',
                  }}
                >
                  {event.allDay ? (
                  <span style={{ fontStyle: 'italic', color: '#5A7A5E' }}>All Day</span>
                ) : (
                  formatTimeRange(event.hour, event.endHour, event.minutes, event.endMinutes)
                )}
                </div>
                {event.location && (
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      color: colors.muted,
                      fontStyle: 'italic',
                    }}
                  >
                    📍 {event.location}
                  </div>
                )}
              </div>
                {!readOnly && (
                <div 
                  data-event-buttons
                  style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    flexShrink: 0,
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <button
                    onClick={() => handleEditEvent(event)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.muted,
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
                    title="Edit event"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleRequestDeleteEvent(event)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: colors.muted,
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#F78FB3')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
                    title="Delete event"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                )}
            </div>
            )
          })}
        </div>
      )}
      {showRecurrencePopup && (
        <CalendarPopup
          title="Repeat"
          onSelectDate={(_d, recurrence) => {
            setFormData((prev) => ({ ...prev, recurrence: recurrence ?? null }))
            setShowRecurrencePopup(false)
          }}
          onClose={() => setShowRecurrencePopup(false)}
          allowRecurrence={true}
          initialDate={dateStr}
          initialRecurrence={formData.recurrence}
          showNoDateOption={false}
        />
      )}

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
          if (eventToDelete) {
            const pid = eventToDelete.parentEventId || eventToDelete.id
            store.deleteEvent(pid)
          }
          setEventToDelete(null)
        }}
        onDeleteSingle={() => {
          if (eventToDelete) {
            const pid = eventToDelete.parentEventId || eventToDelete.id
            store.deleteEvent(pid, eventToDelete.date)
          }
          setEventToDelete(null)
        }}
        onDeletePlain={() => {
          if (eventToDelete) {
            const pid = eventToDelete.parentEventId || eventToDelete.id
            store.deleteEvent(pid)
          }
          setEventToDelete(null)
        }}
      />
    </div>
  )
}
