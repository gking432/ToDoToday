'use client'

import { useState } from 'react'
import { format, addDays, addMonths } from 'date-fns'
import { Plus, X, Edit2, Trash2, Calendar as CalendarIcon, ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate, isEventEnded } from '@/lib/utils'
import { CalendarPopup } from './CalendarPopup'
import type { ViewMode, Event } from '@/types'

interface UpcomingEventsProps {
  navigate: (view: ViewMode, date?: Date) => void
}

export function UpcomingEvents({ navigate }: UpcomingEventsProps) {
  const store = useStore()
  const todayStr = formatDate(new Date())
  const [showForm, setShowForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    date: formatDate(new Date()),
    startHour: 9,
    endHour: 10,
    location: '',
    allDay: false,
  })
  const [startTimeInput, setStartTimeInput] = useState('9')
  const [endTimeInput, setEndTimeInput] = useState('10')
  const [startTimeFocused, setStartTimeFocused] = useState(false)
  const [endTimeFocused, setEndTimeFocused] = useState(false)
  const [startHourHovered, setStartHourHovered] = useState(false)
  const [startMinutesHovered, setStartMinutesHovered] = useState(false)
  const [endHourHovered, setEndHourHovered] = useState(false)
  const [endMinutesHovered, setEndMinutesHovered] = useState(false)
  const [startMinutes, setStartMinutes] = useState(0)
  const [endMinutes, setEndMinutes] = useState(0)
  const [showFilterPopup, setShowFilterPopup] = useState(false)
  const [timeframeFilter, setTimeframeFilter] = useState<{ type: 'days' | 'weeks' | 'months', value: number }>({ type: 'weeks', value: 2 })

  // Get next 7 days (full week) for quick selection
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i))
  
  // Calculate end date based on timeframe filter
  const getEndDate = () => {
    const today = new Date()
    if (timeframeFilter.type === 'days') {
      return addDays(today, timeframeFilter.value)
    } else if (timeframeFilter.type === 'weeks') {
      return addDays(today, timeframeFilter.value * 7)
    } else {
      // months
      return addMonths(today, timeframeFilter.value)
    }
  }
  
  const endDateStr = formatDate(getEndDate())
  
  // Get upcoming events (from today onwards, within timeframe)
  const upcomingEvents = store.events
    .filter((event) => {
      // Filter out ended events
      if (isEventEnded(event)) return false
      // Include today and future dates within the timeframe
      return event.date >= todayStr && event.date <= endDateStr
    })
    .sort((a, b) => {
      // Sort by date first, then by hour
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }
      return a.hour - b.hour
    })
    .slice(0, 5) // Show up to 5 upcoming events

  const handleAddEvent = () => {
    if (!formData.title.trim()) return
    
    store.addEvent(
      formData.title.trim(),
      formData.date,
      formData.startHour,
      undefined, // sourceTaskId
      formData.endHour,
      formData.location.trim() || undefined,
      startMinutes,
      endMinutes,
      formData.allDay
    )
    
    // Reset form
    setFormData({
      title: '',
      date: formatDate(new Date()),
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
    setStartTimeInput('9')
    setEndTimeInput('10')
    setStartMinutes(0)
    setEndMinutes(0)
    setShowForm(false)
  }

  const handleEditEvent = (event: Event) => {
    setEditingEventId(event.id)
    setFormData({
      title: event.text,
      date: event.date,
      startHour: event.hour,
      endHour: event.endHour || event.hour + 1,
      location: event.location || '',
      allDay: event.allDay || false,
    })
    setStartMinutes(event.minutes ?? 0)
    setEndMinutes(event.endMinutes ?? 0)
    setStartTimeInput(formatHourDisplay(event.hour))
    setEndTimeInput(formatHourDisplay(event.endHour || event.hour + 1))
    setShowForm(false)
  }

  const handleUpdateEvent = () => {
    if (!formData.title.trim() || !editingEventId) return
    
    store.updateEvent(editingEventId, {
      text: formData.title.trim(),
      date: formData.date,
      hour: formData.allDay ? 0 : formData.startHour,
      minutes: formData.allDay ? undefined : startMinutes,
      endHour: formData.allDay ? undefined : formData.endHour,
      endMinutes: formData.allDay ? undefined : endMinutes,
      location: formData.location.trim() || undefined,
      allDay: formData.allDay,
    })
    
    // Reset form
    setEditingEventId(null)
    setFormData({
      title: '',
      date: formatDate(new Date()),
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
      date: formatDate(new Date()),
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
  }

  const formatHour = (hour: number, minutes: number = 0) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const mins = minutes.toString().padStart(2, '0')
    return `${h}:${mins} ${ampm}`
  }

  const formatHourDisplay = (hour: number) => {
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return h.toString()
  }

  const handleTimeInputChange = (value: string, type: 'start' | 'end') => {
    const numValue = value.replace(/\D/g, '')
    
    if (type === 'start') {
      setStartTimeInput(numValue)
    } else {
      setEndTimeInput(numValue)
    }
  }

  const handleTimeInputKeyDown = (e: React.KeyboardEvent, type: 'start' | 'end') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const numValue = parseInt(type === 'start' ? startTimeInput : endTimeInput)
      
      if (numValue >= 1 && numValue <= 12) {
        // Convert 12-hour to 24-hour format
        // Auto-detect PM for 12, 1, 2, 3, 4, 5 (noon to 5 PM)
        let hour24: number
        if (numValue === 12) {
          // 12 = noon (12 PM)
          hour24 = 12
        } else if (numValue >= 1 && numValue <= 5) {
          // 1-5 = 1 PM - 5 PM (13-17 in 24-hour)
          hour24 = numValue + 12
        } else {
          // 6-11 stay as AM (6-11)
          hour24 = numValue
        }
        
        if (type === 'start') {
          const newStartHour = hour24
          const newEndHour = newStartHour + 1 > 23 ? 23 : newStartHour + 1
          setFormData({ 
            ...formData, 
            startHour: newStartHour,
            // Auto-set end time to 1 hour later
            endHour: newEndHour
          })
          setStartTimeInput(formatHourDisplay(newStartHour))
          setEndTimeInput(formatHourDisplay(newEndHour))
          setStartTimeFocused(false)
        } else {
          // For end time, check if it's after start time (considering minutes)
          const startTimeInMinutes = formData.startHour * 60 + startMinutes
          const endTimeInMinutes = hour24 * 60 + endMinutes
          
          if (endTimeInMinutes > startTimeInMinutes) {
            setFormData({ ...formData, endHour: hour24 })
            setEndTimeInput(formatHourDisplay(hour24))
            setEndTimeFocused(false)
          } else {
            // If typed hour is <= start, add 12 to make it PM
            const pmHour = hour24 === 12 ? 12 : hour24 + 12
            const pmTimeInMinutes = pmHour * 60 + endMinutes
            if (pmTimeInMinutes > startTimeInMinutes && pmHour <= 23) {
              setFormData({ ...formData, endHour: pmHour })
              setEndTimeInput(formatHourDisplay(pmHour))
              setEndTimeFocused(false)
            }
          }
        }
      }
    }
  }

  const toggleAMPM = (type: 'start' | 'end') => {
    if (type === 'start') {
      const currentHour = formData.startHour
      let newHour: number
      if (currentHour >= 12) {
        // Convert PM to AM
        newHour = currentHour === 12 ? 0 : currentHour - 12
      } else {
        // Convert AM to PM
        newHour = currentHour === 0 ? 12 : currentHour + 12
      }
      const newEndHour = newHour + 1 > 23 ? 23 : newHour + 1
      setFormData({ 
        ...formData, 
        startHour: newHour,
        // Auto-update end time
        endHour: newEndHour
      })
      setStartTimeInput(formatHourDisplay(newHour))
      setEndTimeInput(formatHourDisplay(newEndHour))
    } else {
      const currentHour = formData.endHour || formData.startHour + 1
      let newHour: number
      if (currentHour >= 12) {
        // Convert PM to AM
        newHour = currentHour === 12 ? 0 : currentHour - 12
      } else {
        // Convert AM to PM
        newHour = currentHour === 0 ? 12 : currentHour + 12
      }
      // Ensure end time is after start time (considering minutes)
      const startTimeInMinutes = formData.startHour * 60 + startMinutes
      const newEndTimeInMinutes = newHour * 60 + endMinutes
      if (newEndTimeInMinutes > startTimeInMinutes && newHour <= 23) {
        setFormData({ ...formData, endHour: newHour })
        setEndTimeInput(formatHourDisplay(newHour))
      }
    }
  }

  const adjustMinutes = (type: 'start' | 'end', direction: 'up' | 'down') => {
    if (type === 'start') {
      let newMinutes = startMinutes + (direction === 'up' ? 15 : -15)
      if (newMinutes < 0) {
        newMinutes = 45
        if (formData.startHour > 0) {
          const newStartHour = formData.startHour - 1
          const newEndHour = newStartHour + 1 > 23 ? 23 : newStartHour + 1
          setFormData({ ...formData, startHour: newStartHour, endHour: newEndHour })
          setEndTimeInput(formatHourDisplay(newEndHour))
        }
      } else if (newMinutes >= 60) {
        newMinutes = 0
        if (formData.startHour < 23) {
          const newStartHour = formData.startHour + 1
          const newEndHour = newStartHour + 1 > 23 ? 23 : newStartHour + 1
          setFormData({ ...formData, startHour: newStartHour, endHour: newEndHour })
          setEndTimeInput(formatHourDisplay(newEndHour))
        }
      }
      setStartMinutes(newMinutes)
    } else {
      let newMinutes = endMinutes + (direction === 'up' ? 15 : -15)
      const startTimeInMinutes = formData.startHour * 60 + startMinutes
      
      if (newMinutes < 0) {
        newMinutes = 45
        if (formData.endHour && formData.endHour > formData.startHour) {
          const newEndHour = formData.endHour - 1
          const newEndTimeInMinutes = newEndHour * 60 + newMinutes
          if (newEndTimeInMinutes > startTimeInMinutes) {
            setFormData({ ...formData, endHour: newEndHour })
            setEndTimeInput(formatHourDisplay(newEndHour))
          }
        }
      } else if (newMinutes >= 60) {
        newMinutes = 0
        if (formData.endHour && formData.endHour < 23) {
          const newEndHour = formData.endHour + 1
          setFormData({ ...formData, endHour: newEndHour })
          setEndTimeInput(formatHourDisplay(newEndHour))
        }
      } else {
        // Check if the new end time is still after start time
        const newEndTimeInMinutes = (formData.endHour || formData.startHour + 1) * 60 + newMinutes
        if (newEndTimeInMinutes <= startTimeInMinutes) {
          // Don't allow end time to be before or equal to start time
          return
        }
      }
      setEndMinutes(newMinutes)
    }
  }

  const adjustHour = (type: 'start' | 'end', direction: 'up' | 'down') => {
    if (type === 'start') {
      let newHour = formData.startHour + (direction === 'up' ? 1 : -1)
      newHour = Math.max(0, Math.min(23, newHour))
      const newEndHour = newHour + 1 > 23 ? 23 : newHour + 1
      setFormData({ ...formData, startHour: newHour, endHour: newEndHour })
      setStartTimeInput(formatHourDisplay(newHour))
      setEndTimeInput(formatHourDisplay(newEndHour))
    } else {
      let newHour = (formData.endHour || formData.startHour + 1) + (direction === 'up' ? 1 : -1)
      const startTimeInMinutes = formData.startHour * 60 + startMinutes
      const newEndTimeInMinutes = newHour * 60 + endMinutes
      
      // Ensure end time is after start time
      if (newEndTimeInMinutes > startTimeInMinutes) {
        newHour = Math.max(formData.startHour + 1, Math.min(23, newHour))
        setFormData({ ...formData, endHour: newHour })
        setEndTimeInput(formatHourDisplay(newHour))
      }
    }
  }

  const formatTimeRange = (startHour: number, endHour?: number, startMinutes?: number, endMinutes?: number) => {
    const startMins = startMinutes ?? 0
    const endMins = endMinutes ?? 0
    if (endHour && (endHour !== startHour || endMins !== startMins)) {
      return `${formatHour(startHour, startMins)} - ${formatHour(endHour, endMins)}`
    }
    return formatHour(startHour, startMins)
  }

  const getTimeframeLabel = () => {
    if (timeframeFilter.type === 'days') {
      return `${timeframeFilter.value} ${timeframeFilter.value === 1 ? 'day' : 'days'}`
    } else if (timeframeFilter.type === 'weeks') {
      return `${timeframeFilter.value} ${timeframeFilter.value === 1 ? 'week' : 'weeks'}`
    } else {
      return `${timeframeFilter.value} ${timeframeFilter.value === 1 ? 'month' : 'months'}`
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Green header */}
      <div className="card-header flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Upcoming Events</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowFilterPopup(true)}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#E8EFE6',
                border: 'none',
                cursor: 'pointer',
                color: '#006747',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C8D5C2'
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E8EFE6'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <SlidersHorizontal size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => {
                setShowForm(true)
                setEditingEventId(null)
              }}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#E8EFE6',
                border: 'none',
                cursor: 'pointer',
                color: '#006747',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C8D5C2'
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E8EFE6'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* White body */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px 14px' }}>
        {/* Event creation/editing form */}
        {(showForm || editingEventId) && (
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

              <div>
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: '#5A7A5E',
                    fontWeight: 500,
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Date
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', width: '100%' }}>
                  {next7Days.map((day, index) => {
                    const dayStr = formatDate(day)
                    const isSelected = formData.date === dayStr
                    const isToday = index === 0
                    return (
                      <button
                        key={dayStr}
                        onClick={() => setFormData({ ...formData, date: dayStr })}
                        style={{
                          flex: 1,
                          aspectRatio: '1',
                          padding: '0',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #006747' : '1px solid #E8EFE6',
                          backgroundColor: isSelected ? '#E8EFE6' : '#FFFFFF',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '10px',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? '#006747' : '#1A2E1A',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#006747'
                            e.currentTarget.style.backgroundColor = '#F5F9F7'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.borderColor = '#E8EFE6'
                            e.currentTarget.style.backgroundColor = '#FFFFFF'
                          }
                        }}
                      >
                        <span>{format(day, 'EEE')}</span>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>
                          {isToday ? 'Today' : format(day, 'd')}
                        </span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setShowCalendar(true)}
                    style={{
                      flex: 1,
                      aspectRatio: '1',
                      padding: '0',
                      borderRadius: '8px',
                      border: '1px solid #E8EFE6',
                      backgroundColor: '#FFFFFF',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '10px',
                      fontWeight: 500,
                      color: '#1A2E1A',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#006747'
                      e.currentTarget.style.backgroundColor = '#F5F9F7'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E8EFE6'
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }}
                  >
                    <CalendarIcon size={16} strokeWidth={2} />
                    <span style={{ fontSize: '8px' }}>More</span>
                  </button>
                </div>
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
                        marginBottom: '8px',
                      }}
                    >
                      Start Time
                    </label>
                  <div
                    style={{
                      border: '1px solid #E8EFE6',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                      {/* Hour section */}
                      <div
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        onMouseEnter={() => setStartHourHovered(true)}
                        onMouseLeave={() => setStartHourHovered(false)}
                      >
                        {startHourHovered && !startTimeFocused && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustHour('start', 'up')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustHour('start', 'down')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                bottom: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </>
                        )}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={startTimeFocused ? startTimeInput : formatHourDisplay(formData.startHour)}
                            onChange={(e) => handleTimeInputChange(e.target.value, 'start')}
                            onKeyDown={(e) => handleTimeInputKeyDown(e, 'start')}
                            onFocus={(e) => {
                              setStartTimeFocused(true)
                              setStartTimeInput('')
                              e.target.select()
                            }}
                            onBlur={() => {
                              setStartTimeFocused(false)
                              setStartTimeInput(formatHourDisplay(formData.startHour))
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.currentTarget.focus()
                            }}
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '24px',
                              fontWeight: 600,
                              color: '#006747',
                              textAlign: 'center',
                              border: 'none',
                              backgroundColor: 'transparent',
                              outline: 'none',
                              width: '30px',
                              cursor: 'text',
                              padding: 0,
                            }}
                            placeholder=""
                          />
                          {startTimeFocused && (
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '24px', fontWeight: 600, color: '#006747' }}>:00</span>
                          )}
                        </div>
                      </div>
                      {!startTimeFocused && (
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '24px', fontWeight: 600, color: '#006747', margin: '0 4px' }}>:</span>
                      )}
                      {/* Minutes section */}
                      <div
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        onMouseEnter={() => setStartMinutesHovered(true)}
                        onMouseLeave={() => setStartMinutesHovered(false)}
                      >
                        {startMinutesHovered && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustMinutes('start', 'up')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustMinutes('start', 'down')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                bottom: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </>
                        )}
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '24px',
                            fontWeight: 600,
                            color: '#006747',
                            minWidth: '30px',
                            textAlign: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {startMinutes.toString().padStart(2, '0')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAMPM('start')}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          color: '#006747',
                          marginLeft: '4px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E8EFE6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        {formData.startHour >= 12 ? 'PM' : 'AM'}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '11px',
                      color: '#5A7A5E',
                      fontWeight: 500,
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    End Time
                  </label>
                  <div
                    style={{
                      border: '1px solid #E8EFE6',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}>
                      {/* Hour section */}
                      <div
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        onMouseEnter={() => setEndHourHovered(true)}
                        onMouseLeave={() => setEndHourHovered(false)}
                      >
                        {endHourHovered && !endTimeFocused && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustHour('end', 'up')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustHour('end', 'down')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                bottom: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </>
                        )}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={endTimeFocused ? endTimeInput : formatHourDisplay(formData.endHour)}
                            onChange={(e) => handleTimeInputChange(e.target.value, 'end')}
                            onKeyDown={(e) => handleTimeInputKeyDown(e, 'end')}
                            onFocus={(e) => {
                              setEndTimeFocused(true)
                              setEndTimeInput('')
                              e.target.select()
                            }}
                            onBlur={() => {
                              setEndTimeFocused(false)
                              setEndTimeInput(formatHourDisplay(formData.endHour))
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.currentTarget.focus()
                            }}
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '24px',
                              fontWeight: 600,
                              color: '#006747',
                              textAlign: 'center',
                              border: 'none',
                              backgroundColor: 'transparent',
                              outline: 'none',
                              width: '30px',
                              cursor: 'text',
                              padding: 0,
                            }}
                            placeholder=""
                          />
                          {endTimeFocused && (
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '24px', fontWeight: 600, color: '#006747' }}>:00</span>
                          )}
                        </div>
                      </div>
                      {!endTimeFocused && (
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '24px', fontWeight: 600, color: '#006747', margin: '0 4px' }}>:</span>
                      )}
                      {/* Minutes section */}
                      <div
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        onMouseEnter={() => setEndMinutesHovered(true)}
                        onMouseLeave={() => setEndMinutesHovered(false)}
                      >
                        {endMinutesHovered && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustMinutes('end', 'up')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                top: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                adjustMinutes('end', 'down')
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: '#006747',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                                bottom: '-16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                            >
                              <ChevronDown size={16} />
                            </button>
                          </>
                        )}
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '24px',
                            fontWeight: 600,
                            color: '#006747',
                            minWidth: '30px',
                            textAlign: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          {endMinutes.toString().padStart(2, '0')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleAMPM('end')}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '16px',
                          fontWeight: 400,
                          color: '#006747',
                          marginLeft: '4px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E8EFE6'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        {formData.endHour >= 12 ? 'PM' : 'AM'}
                      </button>
                    </div>
                  </div>
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
        )}

        {upcomingEvents.length === 0 && !showForm && !editingEventId ? (
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#5A7A5E',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            No upcoming events
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcomingEvents.map((event) => {
              // Compare date strings directly (both should be in YYYY-MM-DD format)
              const isToday = event.date === todayStr

              return (
                <div
                  key={event.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: '#F5F9F7',
                    border: '1px solid #E8EFE6',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                        color: '#1A2E1A',
                        lineHeight: '1.4',
                        marginBottom: '4px',
                        fontWeight: 500,
                      }}
                    >
                      {event.text}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        color: isToday ? '#006747' : '#5A7A5E',
                        marginBottom: event.location ? '4px' : '0',
                      }}
                    >
                      {isToday ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('daily', new Date())
                          }}
                          style={{
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#006747'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#006747'
                          }}
                        >
                          Today {event.allDay ? '' : `at ${formatTimeRange(event.hour, event.endHour, event.minutes, event.endMinutes)}`}
                          {event.allDay && <span style={{ fontStyle: 'italic' }}>— All Day</span>}
                        </span>
                      ) : (() => {
                          // Parse date string (YYYY-MM-DD) to avoid timezone issues
                          const [year, month, day] = event.date.split('-').map(Number)
                          const eventDate = new Date(year, month - 1, day)
                          const dateText = event.allDay 
                            ? `${format(eventDate, 'MMM d')} — All Day`
                            : `${format(eventDate, 'MMM d')} at ${formatTimeRange(event.hour, event.endHour, event.minutes, event.endMinutes)}`
                          return (
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate('daily', eventDate)
                              }}
                              style={{
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#006747'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#5A7A5E'
                              }}
                            >
                              {dateText}
                            </span>
                          )
                        })()}
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
              )
            })}
          </div>
        )}
      </div>

      {/* Calendar Popup */}
      {showCalendar && (
        <CalendarPopup
          title="Select Event Date"
          showNoDateOption={false}
          onSelectDate={(date) => {
            if (date) {
              setFormData({ ...formData, date })
            }
            setShowCalendar(false)
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}

      {/* Filter Popup */}
      {showFilterPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowFilterPopup(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '20px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1A2E1A',
                  margin: 0,
                }}
              >
                Filter Timeframe
              </h2>
              <button
                onClick={() => setShowFilterPopup(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#5A7A5E',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2E1A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Number input with arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => {
                    const maxValue = timeframeFilter.type === 'days' ? 6 : timeframeFilter.type === 'weeks' ? 3 : 12
                    let newValue = timeframeFilter.value + 1
                    let newType = timeframeFilter.type
                    
                    // Auto-switch logic
                    if (timeframeFilter.type === 'days' && newValue > 6) {
                      newType = 'weeks'
                      newValue = 1
                    } else if (timeframeFilter.type === 'weeks' && newValue > 3) {
                      newType = 'months'
                      newValue = 1
                    } else {
                      newValue = Math.min(newValue, maxValue)
                    }
                    
                    setTimeframeFilter({ type: newType, value: newValue })
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#006747',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                >
                  <ChevronUp size={16} />
                </button>
                <input
                  type="number"
                  value={timeframeFilter.value}
                  onChange={(e) => {
                    const numValue = parseInt(e.target.value) || 1
                    const maxValue = timeframeFilter.type === 'days' ? 6 : timeframeFilter.type === 'weeks' ? 3 : 12
                    let newValue = numValue
                    let newType = timeframeFilter.type
                    
                    // Auto-switch logic
                    if (timeframeFilter.type === 'days' && newValue > 6) {
                      newType = 'weeks'
                      newValue = 1
                    } else if (timeframeFilter.type === 'weeks' && newValue > 3) {
                      newType = 'months'
                      newValue = 1
                    } else {
                      const minValue = 1
                      newValue = Math.max(minValue, Math.min(newValue, maxValue))
                    }
                    
                    setTimeframeFilter({ type: newType, value: newValue })
                  }}
                  min={1}
                  max={timeframeFilter.type === 'days' ? 6 : timeframeFilter.type === 'weeks' ? 3 : 12}
                  style={{
                    width: '60px',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #E8EFE6',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: '#1A2E1A',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                  className="no-spinner"
                />
                <button
                  onClick={() => {
                    const newValue = Math.max(timeframeFilter.value - 1, 1)
                    setTimeframeFilter({ ...timeframeFilter, value: newValue })
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#006747',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#004d33')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#006747')}
                >
                  <ChevronDown size={16} />
                </button>
              </div>

              {/* Type buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    const maxValue = 6
                    const adjustedValue = Math.min(timeframeFilter.value, maxValue)
                    setTimeframeFilter({ type: 'days', value: adjustedValue || 1 })
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: timeframeFilter.type === 'days' ? '2px solid #006747' : '1px solid #E8EFE6',
                    backgroundColor: timeframeFilter.type === 'days' ? '#E8EFE6' : '#FFFFFF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: timeframeFilter.type === 'days' ? '#006747' : '#1A2E1A',
                    cursor: 'pointer',
                    fontWeight: timeframeFilter.type === 'days' ? 600 : 400,
                  }}
                >
                  Days
                </button>
                <button
                  onClick={() => {
                    const maxValue = 3
                    const adjustedValue = Math.min(timeframeFilter.value, maxValue)
                    setTimeframeFilter({ type: 'weeks', value: adjustedValue || 1 })
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: timeframeFilter.type === 'weeks' ? '2px solid #006747' : '1px solid #E8EFE6',
                    backgroundColor: timeframeFilter.type === 'weeks' ? '#E8EFE6' : '#FFFFFF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: timeframeFilter.type === 'weeks' ? '#006747' : '#1A2E1A',
                    cursor: 'pointer',
                    fontWeight: timeframeFilter.type === 'weeks' ? 600 : 400,
                  }}
                >
                  Weeks
                </button>
                <button
                  onClick={() => {
                    const maxValue = 12
                    const adjustedValue = Math.min(timeframeFilter.value, maxValue)
                    setTimeframeFilter({ type: 'months', value: adjustedValue || 1 })
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: timeframeFilter.type === 'months' ? '2px solid #006747' : '1px solid #E8EFE6',
                    backgroundColor: timeframeFilter.type === 'months' ? '#E8EFE6' : '#FFFFFF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: timeframeFilter.type === 'months' ? '#006747' : '#1A2E1A',
                    cursor: 'pointer',
                    fontWeight: timeframeFilter.type === 'months' ? 600 : 400,
                  }}
                >
                  Months
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => setShowFilterPopup(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #E8EFE6',
                  backgroundColor: 'transparent',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: '#5A7A5E',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowFilterPopup(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#006747',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
