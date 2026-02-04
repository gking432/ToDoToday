'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { DailyEvents } from './DailyEvents'
import { DueItemsSummary } from './DueItemsSummary'
import { useStore } from '@/hooks/useStore'
import { formatDate, isEventEnded, getEventsForDate } from '@/lib/utils'
import type { ViewMode, Event } from '@/types'

interface DailyViewProps {
  date: Date
  navigate: (view: ViewMode, date?: Date) => void
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
}

export function DailyView({ date, navigate, isExpanded = false, onExpand, onCollapse }: DailyViewProps) {
  const store = useStore()
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  const [resizingEventId, setResizingEventId] = useState<string | null>(null)
  const [resizeTargetHour, setResizeTargetHour] = useState<number | null>(null)
  const [creatingEventForHour, setCreatingEventForHour] = useState<number | null>(null)
  const [eventFormData, setEventFormData] = useState({
    title: '',
    endHour: 10,
    location: '',
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const hourlyScrollRef = useRef<HTMLDivElement>(null)
  const dateStr = formatDate(date)
  const todayStr = formatDate(new Date())
  const isToday = dateStr === todayStr

  const hours = Array.from({ length: 24 }, (_, i) => i) // Midnight (0) – 11 PM (23)

  // Update current time every second for smooth movement
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second for smooth movement

    return () => clearInterval(timer)
  }, [])

  // Scroll to 6 AM when expanded
  useEffect(() => {
    if (isExpanded && hourlyScrollRef.current) {
      // Each hour slot is now 72px (minHeight) + 4px gap = 76px
      // 6 AM is at index 6, so scroll to 6 * 76 = 456px
      const hourSlotHeight = 76 // 72px minHeight + 4px gap
      const scrollToPosition = 6 * hourSlotHeight
      hourlyScrollRef.current.scrollTop = scrollToPosition
    }
  }, [isExpanded])

  // Get all events for this date (including recurring)
  const eventsForDate = getEventsForDate<Event>(store.events, date)

  const getEventsForSlot = (hour: number) => {
    return eventsForDate.filter((event) => {
      if (event.allDay) return false // Filter out all-day events from hourly slots
      // Only show events that START at this hour (we'll render spanning events separately)
      return event.hour === hour
    })
  }

  const getSpanningEventsForSlot = (hour: number) => {
    return eventsForDate.filter((event) => {
      if (event.allDay) return false // Filter out all-day events from hourly slots
      // Show events that span through this hour but don't start here
      const endHour = event.endHour || event.hour + 1
      return event.hour < hour && endHour > hour
    })
  }

  const handleDragOver = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(hour)
  }

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault()
    setDragOverSlot(null)
    const data = e.dataTransfer.getData('text/plain')
    if (!data) return

    // Check if it's an event (starts with 'event:') or a task
    if (data.startsWith('event:')) {
      const eventId = data.replace('event:', '')
      const event = store.events.find((ev) => ev.id === eventId)
      if (event) {
        // Move event to new hour
        store.updateEvent(eventId, { hour })
      }
    } else {
      // It's a task
      const task = store.tasks.find((t) => t.id === data)
      if (task) {
        // Create an event from the task
        store.addEvent(task.text, dateStr, hour, task.id)
      }
    }
    setDraggingEventId(null)
  }

  const handleEventDragStart = (e: React.DragEvent, eventId: string, isMoveHandle: boolean) => {
    if (isMoveHandle) {
      // Moving event to different time slot
      e.dataTransfer.setData('text/plain', `event:${eventId}`)
      e.dataTransfer.effectAllowed = 'move'
      setDraggingEventId(eventId)
    } else {
      // Resizing/extending event duration
      e.preventDefault()
      e.stopPropagation()
      setResizingEventId(eventId)
      setResizeTargetHour(null)
    }
  }

  const handleEventDragEnd = () => {
    setDraggingEventId(null)
  }

  const handleResizeStart = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    let hasMoved = false
    let targetHour: number | null = null
    const event = store.events.find((ev) => ev.id === eventId)
    if (!event) return
    
    const initialEndHour = event.endHour || event.hour + 1
    
    // Prevent text selection
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ns-resize'
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Only start resizing if mouse has moved significantly (not just a click)
      const deltaX = Math.abs(moveEvent.clientX - startX)
      const deltaY = Math.abs(moveEvent.clientY - startY)
      
      if (deltaX > 3 || deltaY > 3) {
        hasMoved = true
        if (!resizingEventId) {
          setResizingEventId(eventId)
          setResizeTargetHour(null)
        }
        
        // Find which hour slot the mouse is over
        const elements = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY)
        const hourSlot = elements.find((el) => {
          const hourAttr = el.getAttribute('data-hour-slot')
          return hourAttr !== null
        })
        
        if (hourSlot) {
          const hour = parseInt(hourSlot.getAttribute('data-hour-slot') || '0')
          if (hour > event.hour) {
            targetHour = hour
            setResizeTargetHour(hour)
          }
        }
      }
    }
    
    const handleMouseUp = () => {
      // Restore text selection
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      
      if (hasMoved && targetHour !== null && targetHour !== initialEndHour) {
        store.updateEvent(eventId, { endHour: targetHour })
      }
      setResizingEventId(null)
      setResizeTargetHour(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDragLeave = () => {
    setDragOverSlot(null)
  }

  const removeEventFromSlot = (eventId: string) => {
    store.deleteEvent(eventId)
  }

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

  const handleTimeSlotClick = (hour: number) => {
    const events = getEventsForSlot(hour)
    if (events.length === 0) {
      setCreatingEventForHour(hour)
      setEventFormData({
        title: '',
        endHour: hour + 1,
        location: '',
      })
    }
  }

  const handleCreateEvent = (hour: number) => {
    if (!eventFormData.title.trim()) return
    
    store.addEvent(
      eventFormData.title.trim(),
      dateStr,
      hour,
      undefined, // sourceTaskId
      eventFormData.endHour,
      eventFormData.location.trim() || undefined
    )
    
    setCreatingEventForHour(null)
    setEventFormData({
      title: '',
      endHour: hour + 1,
      location: '',
    })
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Expand if not already expanded when dragging over
    // The drop handler will validate if it's a task or event
    if (!isExpanded && onExpand) {
      onExpand()
    }
  }

  const handleContainerDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    // Expand if not already expanded when dragging enters
    // The drop handler will validate if it's a task or event
    if (!isExpanded && onExpand) {
      onExpand()
    }
  }

  return (
    <div 
      className="flex flex-col h-full"
      onDragOver={handleContainerDragOver}
      onDragEnter={handleContainerDragEnter}
    >
      {/* White header band — date lives here */}
      <div className="card-header flex-shrink-0" style={{ paddingRight: '12px' }}>
        <div className="flex items-start justify-between">
          <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, lineHeight: 1.2 }}>
          {format(date, 'EEEE')}
        </h1>
        <p style={{ fontSize: '14px', marginTop: '4px', fontStyle: 'italic' }}>
          {format(date, 'MMMM d, yyyy')}
        </p>
          </div>
          {/* Today button — only show when viewing a different day */}
          {!isToday && (
            <button
              onClick={() => navigate('daily', new Date())}
              className="transition-colors duration-200"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color: '#006747',
                background: '#E8EFE6',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C8D5C2'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E8EFE6'
              }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* White body — due items + hourly blocks */}
      <div 
        className="flex-1" 
        style={{ 
          padding: '20px 18px 20px 18px',
          paddingRight: '12px', // Extra padding on right to respect rounded corner
          overflow: isExpanded ? 'hidden' : 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Scrollable content area — only show when not expanded */}
        {!isExpanded && (
        <div 
          style={{ 
            flex: '1 1 auto',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
            <DailyEvents date={date} />
          <DueItemsSummary date={date} />

          {/* View full day button — at the bottom of scrollable content, centered */}
            <div 
              style={{ 
                marginTop: 'auto',
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={onExpand}
                className="flex items-center gap-1.5 transition-colors duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: '#5A7A5E',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
              >
                <span>View full day</span>
                <ChevronDown size={12} strokeWidth={1.8} />
              </button>
            </div>
            </div>
          )}

        {/* Hourly blocks — shown inline when expanded, scrollable */}
        {isExpanded && (
          <div 
            ref={hourlyScrollRef}
            style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}
          >
            {/* Collapse button — sticky at top */}
            <div 
              style={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 20,
                backgroundColor: '#FFFFFF',
                paddingTop: '8px',
                paddingBottom: '8px',
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <button
                onClick={onCollapse}
                className="flex items-center gap-1.5 transition-colors duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: '#5A7A5E',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
              >
                <ChevronUp size={12} strokeWidth={1.8} />
                <span>Collapse</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
              {/* Current time indicator line - only show if viewing today */}
              {isToday && isExpanded && (() => {
                const now = currentTime
                const currentHour = now.getHours()
                const currentMinute = now.getMinutes()
                const currentSecond = now.getSeconds()
                const hourSlotHeight = 72 // minHeight of each hour slot
                const gap = 4 // gap between hour slots
                const minutesPerHour = 60
                const secondsPerMinute = 60
                const pixelsPerMinute = hourSlotHeight / minutesPerHour
                const pixelsPerSecond = pixelsPerMinute / secondsPerMinute
                
                // Calculate position: (hour * (height + gap)) + (minute * pixelsPerMinute) + (second * pixelsPerSecond) + padding
                const topOffset = currentHour * (hourSlotHeight + gap) + (currentMinute * pixelsPerMinute) + (currentSecond * pixelsPerSecond) + 10
                
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: '88px', // 64px time label + 24px gap
                      right: '12px',
                      top: `${topOffset}px`,
                      height: '2px',
                      backgroundColor: '#F78FB3',
                      zIndex: 5,
                      display: 'flex',
                      alignItems: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Time badge */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-60px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        backgroundColor: '#F78FB3',
                        color: '#FFFFFF',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '10px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatHour(currentHour, currentMinute)}
                    </div>
                  </div>
                )
              })()}
              
              {/* Render spanning events as single boxes over multiple hours */}
              {eventsForDate
                .filter((event) => !event.allDay) // Filter out all-day events
                .map((event) => {
                  const isResizing = resizingEventId === event.id
                  const currentEndHour = isResizing && resizeTargetHour ? resizeTargetHour : (event.endHour || event.hour + 1)
                  const duration = currentEndHour - event.hour
                  const eventHasEnded = isEventEnded(event)
                  
                  if (duration <= 1) return null // Only render multi-hour events here
                  
                  const startHourIndex = hours.indexOf(event.hour)
                  if (startHourIndex === -1) return null
                  
                  const hourSlotHeight = 72 // minHeight of each hour slot
                  const gap = 4 // gap between hour slots
                  const topOffset = startHourIndex * (hourSlotHeight + gap) + 10 // padding top
                  const height = duration * (hourSlotHeight + gap) - gap - 20 // total height minus gaps and padding
                  
                  return (
                    <div
                      key={`spanning-${event.id}`}
                      style={{
                        position: 'absolute',
                        left: '88px', // 64px time label + 24px gap
                        right: '12px',
                        top: `${topOffset}px`,
                        height: `${height}px`,
                        padding: '8px 12px',
                        borderRadius: '7px',
                        backgroundColor: eventHasEnded ? 'transparent' : (isResizing ? '#F5F9F7' : '#FFFFFF'),
                        border: eventHasEnded ? 'none' : (isResizing ? '2px solid #006747' : '1px solid #006747'),
                        boxShadow: eventHasEnded ? 'none' : '0 1px 2px rgba(0,40,25,0.06)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        zIndex: 3, // Higher z-index to cover hour slot content
                        transition: isResizing ? 'none' : 'all 0.2s ease',
                        userSelect: 'none',
                        cursor: isResizing ? 'ns-resize' : 'default',
                        opacity: eventHasEnded ? 0.5 : 1,
                        overflow: 'visible',
                        minHeight: '72px', // Ensure minimum height to show all content
                      }}
                      onMouseDown={(e) => {
                        if (eventHasEnded) return // Don't allow resizing ended events
                        const target = e.target as HTMLElement
                        if (!target.closest('[data-move-handle]') && !target.closest('button')) {
                          handleResizeStart(e, event.id)
                        }
                      }}
                    >
                      {/* Move handle at the top - only show if event hasn't ended */}
                      {!eventHasEnded && (
                        <div
                          data-move-handle
                          draggable
                          onDragStart={(e) => {
                            e.stopPropagation()
                            handleEventDragStart(e, event.id, true)
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '8px',
                            cursor: 'move',
                            backgroundColor: 'transparent',
                            zIndex: 10,
                          }}
                          title="Drag to move event"
                        />
                      )}
                      <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        minWidth: 0,
                        overflow: 'visible',
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 500,
                            color: eventHasEnded ? '#5A7A5E' : '#1A2E1A',
                            textDecoration: eventHasEnded ? 'line-through' : 'none',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                          }}
                        >
                          {event.text}
                        </span>
                        <div
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '11px',
                            color: eventHasEnded ? '#5A7A5E' : '#5A7A5E',
                            textDecoration: eventHasEnded ? 'line-through' : 'none',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                          }}
                        >
                          {formatTimeRange(event.hour, event.endHour, event.minutes, event.endMinutes)}
                        </div>
                        {event.location && (
                          <div
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '11px',
                              color: eventHasEnded ? '#5A7A5E' : '#5A7A5E',
                              fontStyle: 'italic',
                              textDecoration: eventHasEnded ? 'line-through' : 'none',
                              whiteSpace: 'normal',
                              wordWrap: 'break-word',
                              wordBreak: 'break-word',
                            }}
                          >
                            📍 {event.location}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeEventFromSlot(event.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#C8D5C2',
                          padding: 0,
                          display: 'flex',
                          alignSelf: 'flex-start',
                          marginTop: '2px',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#F78FB3')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#C8D5C2')}
                      >
                        <X size={12} />
                      </button>
                      {/* Duration indicator during resize */}
                      {isResizing && duration > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '10px',
                            color: '#006747',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            backgroundColor: '#E8EFE6',
                            padding: '2px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          {duration} hour{duration > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              
              {hours.map((hour) => {
                const events = getEventsForSlot(hour)
                const isDragOver = dragOverSlot === hour
                const isResizeTarget = resizingEventId && resizeTargetHour !== null && hour >= (store.events.find(e => e.id === resizingEventId)?.hour || 0) && hour < resizeTargetHour

                return (
                  <div
                    key={hour}
                    data-hour-slot={hour}
                    onClick={() => handleTimeSlotClick(hour)}
                    onDragOver={(e) => handleDragOver(e, hour)}
                    onDrop={(e) => handleDrop(e, hour)}
                    onDragLeave={handleDragLeave}
                    className="flex items-start gap-3 transition-all duration-150"
                    style={{
                      minHeight: '72px',
                      padding: '10px 12px',
                      borderRadius: '0',
                      backgroundColor: isDragOver ? '#FFF8D6' : isResizeTarget ? '#E8EFE6' : '#FFFFFF',
                      border: isDragOver ? '2px dashed #FFD700' : isResizeTarget ? '2px solid #006747' : 'none',
                      borderBottom: isDragOver || isResizeTarget ? undefined : '1px solid #E8EFE6',
                      cursor: events.length === 0 && creatingEventForHour !== hour ? 'pointer' : resizingEventId ? 'ns-resize' : 'default',
                      position: 'relative',
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
                        zIndex: 1,
                      }}
                    >
                      {formatHour(hour)}
                    </div>

                    {/* Events or drop hint or create event form */}
                    <div className="flex-1 min-w-0" style={{ position: 'relative', zIndex: 2 }}>
                      {creatingEventForHour === hour ? (
                        <div 
                          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={eventFormData.title}
                            onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                            placeholder="Event title"
                            autoFocus
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1px solid #E8EFE6',
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: '12px',
                              color: '#1A2E1A',
                              outline: 'none',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateEvent(hour)
                              } else if (e.key === 'Escape') {
                                setCreatingEventForHour(null)
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <select
                              value={eventFormData.endHour}
                              onChange={(e) => setEventFormData({ ...eventFormData, endHour: parseInt(e.target.value) })}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #E8EFE6',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                color: '#1A2E1A',
                                outline: 'none',
                              }}
                            >
                              {Array.from({ length: 24 }, (_, i) => i)
                                .filter((h) => h > hour)
                                .map((h) => (
                                  <option key={h} value={h}>
                                    {formatHour(h)}
                                  </option>
                                ))}
                            </select>
                            <input
                              type="text"
                              value={eventFormData.location}
                              onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                              placeholder="Location (optional)"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #E8EFE6',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                color: '#1A2E1A',
                                outline: 'none',
                              }}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCreateEvent(hour)
                              }}
                              disabled={!eventFormData.title.trim()}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: eventFormData.title.trim() ? '#006747' : '#C8D5C2',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                color: '#FFFFFF',
                                cursor: eventFormData.title.trim() ? 'pointer' : 'not-allowed',
                              }}
                            >
                              Add
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setCreatingEventForHour(null)
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E8EFE6',
                                backgroundColor: 'transparent',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                color: '#5A7A5E',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : events.length === 0 ? (
                        // Check if this hour is covered by a spanning event
                        (() => {
                          const spanningEvents = store.events.filter((event) => {
                            if (event.date !== dateStr) return false
                            if (event.allDay) return false // Filter out all-day events
                            const endHour = event.endHour || event.hour + 1
                            return event.hour < hour && endHour > hour
                          })
                          // If there's a spanning event covering this hour, don't show the text
                          if (spanningEvents.length > 0) {
                            return null
                          }
                          return (
                            <div
                              onClick={() => handleTimeSlotClick(hour)}
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                color: isDragOver ? '#9A7B0A' : '#C8D5C2',
                                fontStyle: 'italic',
                                paddingTop: '2px',
                                cursor: 'pointer',
                              }}
                            >
                              {isDragOver ? 'Drop here' : 'Drop a task here or click to create event'}
                            </div>
                          )
                        })()
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {events
                            .filter((event) => event.hour === hour) // Only show events that start at this hour
                            .map((event) => {
                              const eventDuration = (event.endHour || event.hour + 1) - event.hour
                              const isDragging = draggingEventId === event.id
                              const isResizing = resizingEventId === event.id
                              const currentResizeEnd = isResizing && resizeTargetHour ? resizeTargetHour : (event.endHour || event.hour + 1)
                              const displayDuration = isResizing ? currentResizeEnd - event.hour : eventDuration
                              const eventHasEnded = isEventEnded(event)
                              
                              return (
                                <div
                                  key={event.id}
                                  onMouseDown={(e) => {
                                    if (eventHasEnded) return // Don't allow resizing ended events
                                    // Only start resize if not clicking on the move handle or delete button
                                    const target = e.target as HTMLElement
                                    if (!target.closest('[data-move-handle]') && !target.closest('button')) {
                                      handleResizeStart(e, event.id)
                                    }
                                  }}
                              className="flex items-start justify-between gap-2"
                              style={{
                                padding: '8px 12px',
                                borderRadius: '7px',
                                    backgroundColor: eventHasEnded ? 'transparent' : (isDragging ? '#E8EFE6' : isResizing ? '#F5F9F7' : '#FFFFFF'),
                                    border: eventHasEnded ? 'none' : (isDragging ? '2px dashed #006747' : isResizing ? '2px solid #006747' : '1px solid #006747'),
                                boxShadow: eventHasEnded ? 'none' : '0 1px 2px rgba(0,40,25,0.06)',
                                    cursor: isResizing ? 'ns-resize' : 'default',
                                    opacity: isDragging ? 0.5 : (eventHasEnded ? 0.5 : 1),
                                    position: 'relative',
                                    transition: isResizing ? 'none' : 'all 0.2s ease',
                                    minHeight: '72px',
                                    overflow: 'visible',
                                  }}
                                >
                                  {/* Move handle at the top - only show if event hasn't ended */}
                                  {!eventHasEnded && (
                                    <div
                                      data-move-handle
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation()
                                        handleEventDragStart(e, event.id, true)
                                      }}
                                      style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '8px',
                                        cursor: 'move',
                                        backgroundColor: 'transparent',
                                        zIndex: 10,
                                      }}
                                      title="Drag to move event"
                                    />
                                  )}
                              <div style={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '4px',
                                minWidth: 0,
                                overflow: 'visible',
                                wordWrap: 'break-word',
                                wordBreak: 'break-word',
                              }}>
                                <span
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: eventHasEnded ? '#5A7A5E' : '#1A2E1A',
                                    textDecoration: eventHasEnded ? 'line-through' : 'none',
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {event.text}
                                </span>
                                <div
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    fontSize: '11px',
                                    color: eventHasEnded ? '#5A7A5E' : '#5A7A5E',
                                    textDecoration: eventHasEnded ? 'line-through' : 'none',
                                    whiteSpace: 'normal',
                                    wordWrap: 'break-word',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {formatTimeRange(event.hour, event.endHour, event.minutes, event.endMinutes)}
                                </div>
                                {event.location && (
                                  <div
                                    style={{
                                      fontFamily: "'DM Sans', sans-serif",
                                      fontSize: '11px',
                                      color: eventHasEnded ? '#5A7A5E' : '#5A7A5E',
                                      fontStyle: 'italic',
                                      textDecoration: eventHasEnded ? 'line-through' : 'none',
                                      whiteSpace: 'normal',
                                      wordWrap: 'break-word',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    📍 {event.location}
                                  </div>
                                )}
                              </div>
                              <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeEventFromSlot(event.id)
                                    }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#C8D5C2',
                                  padding: 0,
                                  display: 'flex',
                                  alignSelf: 'flex-start',
                                  marginTop: '2px',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#F78FB3')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#C8D5C2')}
                              >
                                <X size={12} />
                              </button>
                                  {/* Visual indicator showing duration during resize */}
                                  {isResizing && displayDuration > 1 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: '-20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontFamily: "'DM Sans', sans-serif",
                                        fontSize: '10px',
                                        color: '#006747',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        backgroundColor: '#E8EFE6',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      {displayDuration} hour{displayDuration > 1 ? 's' : ''}
                                    </div>
                                  )}
                            </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}