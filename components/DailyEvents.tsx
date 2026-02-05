'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Edit2, Trash2, X } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate, getEventsForDate } from '@/lib/utils'
import type { Event } from '@/types'

interface DailyEventsProps {
  date: Date
}

export function DailyEvents({ date }: DailyEventsProps) {
  const store = useStore()
  const dateStr = formatDate(date)
  const isToday = formatDate(new Date()) === dateStr
  const [showForm, setShowForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    startHour: 9,
    endHour: 10,
    location: '',
    allDay: false,
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
      formData.allDay
    )
    
    // Reset form
    setFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
    setShowForm(false)
  }

  const handleEditEvent = (event: Event) => {
    setEditingEventId(event.id)
    setFormData({
      title: event.text,
      startHour: event.hour,
      endHour: event.endHour || event.hour + 1,
      location: event.location || '',
      allDay: event.allDay || false,
    })
    setShowForm(false)
  }

  const handleUpdateEvent = () => {
    if (!formData.title.trim() || !editingEventId) return
    
    store.updateEvent(editingEventId, {
      text: formData.title.trim(),
      hour: formData.startHour,
      endHour: formData.endHour,
      location: formData.location.trim() || undefined,
    })
    
    // Reset form
    setEditingEventId(null)
    setFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
  }

  const handleDeleteEvent = (eventId: string) => {
    setDeletingEventId(eventId)
  }

  const confirmDeleteEvent = (eventId: string) => {
    store.deleteEvent(eventId)
    setDeletingEventId(null)
  }

  const cancelDelete = () => {
    setDeletingEventId(null)
  }

  const handleCancelEdit = () => {
    setEditingEventId(null)
    setFormData({
      title: '',
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
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
            color: '#5A7A5E',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Events
        </span>
      </div>

      {(showForm || editingEventId) ? (
        <div
          style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: '#F5F9F7',
            border: '1px solid #E8EFE6',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: '#5A7A5E',
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
                  color: '#5A7A5E',
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
                      color: '#5A7A5E',
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
                      color: '#1A2E1A',
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
                      color: '#5A7A5E',
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
                      color: '#1A2E1A',
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
                  color: '#5A7A5E',
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
                  color: '#5A7A5E',
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
              color: '#5A7A5E',
              fontStyle: 'italic',
            }}
          >
            No events
          </div>
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              color: '#5A7A5E',
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
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3"
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                backgroundColor: '#F5F9F7',
                border: '1px solid #E8EFE6',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (deletingEventId !== event.id) {
                  const buttons = e.currentTarget.querySelector('[data-event-buttons]') as HTMLElement
                  if (buttons) buttons.style.opacity = '1'
                }
              }}
              onMouseLeave={(e) => {
                if (deletingEventId !== event.id) {
                  const buttons = e.currentTarget.querySelector('[data-event-buttons]') as HTMLElement
                  if (buttons) buttons.style.opacity = '0'
                }
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#1A2E1A',
                    lineHeight: '1.4',
                    fontWeight: 500,
                    marginBottom: '4px',
                  }}
                >
                  {event.text}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: '#5A7A5E',
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
                      color: '#5A7A5E',
                      fontStyle: 'italic',
                    }}
                  >
                    📍 {event.location}
                  </div>
                )}
              </div>
              {deletingEventId === event.id ? (
                <div 
                  data-event-buttons
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px', 
                    flexShrink: 0,
                    alignItems: 'flex-end',
                    opacity: 1,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      color: '#5A7A5E',
                    }}
                  >
                    Delete event?
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => confirmDeleteEvent(event.id)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#006747',
                        color: '#FFFFFF',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={cancelDelete}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        border: '1px solid #E8EFE6',
                        backgroundColor: '#FFFFFF',
                        color: '#1A2E1A',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
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
                      color: '#5A7A5E',
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
                    onClick={() => handleDeleteEvent(event.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#5A7A5E',
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
          ))}
        </div>
      )}
    </div>
  )
}
