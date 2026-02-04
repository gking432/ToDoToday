'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate, isOverdue, getTasksForDate as getTasksForDateUtil, getEventsForDate as getEventsForDateUtil } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths,
  isSameDay,
} from 'date-fns'
import type { ViewMode } from '@/types'

interface MonthlyViewProps {
  selectedDate: Date
  navigate: (view: ViewMode, date?: Date) => void
}

export function MonthlyView({ selectedDate, navigate }: MonthlyViewProps) {
  const store = useStore()
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const [showEventPopup, setShowEventPopup] = useState(false)
  const [eventPopupDate, setEventPopupDate] = useState<Date | null>(null)
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [showChoiceDialog, setShowChoiceDialog] = useState(false)
  const [choiceDialogDate, setChoiceDialogDate] = useState<Date | null>(null)
  const [showTaskPopup, setShowTaskPopup] = useState(false)
  const [taskPopupDate, setTaskPopupDate] = useState<Date | null>(null)
  const [taskFormData, setTaskFormData] = useState({ text: '' })
  const [eventFormData, setEventFormData] = useState({
    title: '',
    date: formatDate(new Date()),
    startHour: 9,
    endHour: 10,
    location: '',
    allDay: false,
  })
  const [showDateChangeConfirm, setShowDateChangeConfirm] = useState(false)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [pendingDate, setPendingDate] = useState<Date | null>(null)

  // Sync currentMonth with selectedDate when it changes
  useEffect(() => {
    // Only update if the selectedDate is in a different month than currentMonth
    if (!isSameMonth(selectedDate, currentMonth)) {
      setCurrentMonth(selectedDate)
    }
  }, [selectedDate]) // Only depend on selectedDate, not currentMonth

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const todayStr = formatDate(new Date())

  const getTasksForDate = (date: Date) => {
    const dateStr = formatDate(date)
    const isToday = dateStr === todayStr
    // Get tasks due on this date (including recurring)
    // For recurring tasks, we want to show them even if completed (so they appear crossed off)
    // For non-recurring tasks, only show if not completed
    const tasksForDate = getTasksForDateUtil(store.tasks, date).filter((task) => {
      // For recurring instances, show them regardless of completion (they'll be styled as crossed off)
      if (task.parentTaskId) return true
      // For non-recurring tasks, only show if not completed
      return !task.completed
    })
    
    // If this is today, also include overdue tasks (non-recurring only)
    if (isToday) {
      const overdueTasks = store.tasks.filter((task) => 
        !task.completed && 
        !task.parentTaskId && // Skip recurring instances
        !task.recurrence && // Skip recurring tasks
        task.dueDate && 
        task.dueDate < todayStr && 
        !tasksForDate.some((t: any) => t.id === task.id) // Don't duplicate if already in tasksForDate
      )
      return [...tasksForDate, ...overdueTasks]
    }
    
    return tasksForDate
  }

  const getEventsForDate = (date: Date) => {
    return getEventsForDateUtil(store.events, date)
  }


  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation() // Prevent day cell click from firing
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    // Set drag image opacity
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset opacity after drag ends
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDate(formatDate(date))
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    setDragOverDate(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = store.tasks.find((t) => t.id === taskId)
    if (!task) return

    const dateStr = formatDate(date)
    if (task.dueDate && task.dueDate !== dateStr) {
      // Show confirmation popup instead of browser confirm
      setPendingTaskId(taskId)
      setPendingDate(date)
      setShowDateChangeConfirm(true)
    } else {
      // No confirmation needed if no existing due date or same date
      store.updateTask(taskId, { dueDate: dateStr })
    }
  }

  const confirmDateChange = () => {
    if (pendingTaskId && pendingDate) {
      const dateStr = formatDate(pendingDate)
      store.updateTask(pendingTaskId, { dueDate: dateStr })
    }
    setShowDateChangeConfirm(false)
    setPendingTaskId(null)
    setPendingDate(null)
  }

  const handleDragLeave = () => {
    setDragOverDate(null)
  }

  const handleDateClick = (date: Date, e: React.MouseEvent) => {
    navigate('daily', date)
  }

  const handleAddTask = (date: Date) => {
    const text = window.prompt('Enter task name:')
    if (text && text.trim()) {
      store.addTask(text.trim())
      const newTask = store.tasks[store.tasks.length - 1]
      if (newTask) {
        store.updateTask(newTask.id, { dueDate: formatDate(date) })
      }
    }
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

  const handleDoubleClick = (date: Date) => {
    setChoiceDialogDate(date)
    setShowChoiceDialog(true)
  }

  const handleChoiceEvent = () => {
    if (!choiceDialogDate) return
    setEventPopupDate(choiceDialogDate)
    setEventFormData({
      title: '',
      date: formatDate(choiceDialogDate),
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
    setShowChoiceDialog(false)
    setShowEventPopup(true)
    setChoiceDialogDate(null)
  }

  const handleChoiceTask = () => {
    if (!choiceDialogDate) return
    setTaskPopupDate(choiceDialogDate)
    setTaskFormData({ text: '' })
    setShowChoiceDialog(false)
    setShowTaskPopup(true)
    setChoiceDialogDate(null)
  }

  const handleCloseChoiceDialog = () => {
    setShowChoiceDialog(false)
    setChoiceDialogDate(null)
  }

  const handleCreateTask = () => {
    if (!taskFormData.text.trim() || !taskPopupDate) return
    
    // Create task with due date in a single operation
    const dueDateStr = formatDate(taskPopupDate)
    store.addTask(taskFormData.text.trim(), undefined, dueDateStr)
    
    setShowTaskPopup(false)
    setTaskPopupDate(null)
    setTaskFormData({ text: '' })
  }

  const handleCloseTaskPopup = () => {
    setShowTaskPopup(false)
    setTaskPopupDate(null)
    setTaskFormData({ text: '' })
  }

  const handleCreateEvent = () => {
    if (!eventFormData.title.trim() || !eventPopupDate) return
    
    store.addEvent(
      eventFormData.title.trim(),
      eventFormData.date,
      eventFormData.startHour,
      undefined, // sourceTaskId
      eventFormData.endHour,
      eventFormData.location.trim() || undefined,
      undefined, // minutes
      undefined, // endMinutes
      eventFormData.allDay
    )
    
    setShowEventPopup(false)
    setEventPopupDate(null)
    setEventFormData({
      title: '',
      date: formatDate(new Date()),
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
  }

  const handleCloseEventPopup = () => {
    setShowEventPopup(false)
    setEventPopupDate(null)
    setEventFormData({
      title: '',
      date: formatDate(new Date()),
      startHour: 9,
      endHour: 10,
      location: '',
      allDay: false,
    })
  }

  return (
    <div className="flex flex-col">
      {/* Green header — month nav */}
      <div className="card-header flex-shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="flex items-center justify-center transition-colors duration-150"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#006747',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,103,71,0.1)'
              e.currentTarget.style.color = '#006747'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#006747'
            }}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <h1 style={{ fontSize: '22px', fontWeight: 600, margin: 0 }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h1>

          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="flex items-center justify-center transition-colors duration-150"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#006747',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0,103,71,0.1)'
              e.currentTarget.style.color = '#006747'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#006747'
            }}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Day-of-week labels — white, subtle */}
        <div
          className="grid grid-cols-7 mt-4"
          style={{ gap: '6px' }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '10px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                paddingBottom: '2px',
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* White body — calendar grid */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '12px 14px', position: 'relative' }}>
        <div
          className="grid grid-cols-7"
          style={{ gap: '6px', position: 'relative' }}
        >
          {days.map((day) => {
            const dayStr = formatDate(day)
            const allTasks = getTasksForDate(day)
            const events = getEventsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isToday = dayStr === todayStr
            const isDragOver = dragOverDate === dayStr
            const isExpanded = expandedDate === dayStr
            
            // Separate regular tasks from overdue tasks
            const regularTasks = allTasks.filter((task) => !isOverdue(task.dueDate || ''))
            const overdueTasks = allTasks.filter((task) => isOverdue(task.dueDate || ''))
            
            // Combine: events first, then regular tasks, then overdue tasks
            const totalItems = events.length + regularTasks.length + overdueTasks.length
            const hasMore = totalItems > 2

            
            return (
              <div
                key={dayStr}
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  // Don't navigate if clicking on a draggable task
                  if (target.closest('[draggable="true"]')) {
                    return
                  }
                  if (target.closest('[data-expand-trigger]')) {
                    e.stopPropagation()
                    setExpandedDate(isExpanded ? null : dayStr)
                  } else if (target.closest('[data-collapse-button]')) {
                    e.stopPropagation()
                    setExpandedDate(null)
                  } else {
                    handleDateClick(day, e)
                  }
                }}
                onDoubleClick={() => handleDoubleClick(day)}
                onDragOver={(e) => handleDragOver(e, day)}
                onDrop={(e) => handleDrop(e, day)}
                onDragLeave={handleDragLeave}
                className="cursor-pointer transition-all duration-150"
                style={{
                  minHeight: isExpanded ? 'auto' : '90px',
                  padding: '8px',
                  borderRadius: '10px',
                  opacity: isCurrentMonth ? 1 : 0.3,
                  backgroundColor: isDragOver
                    ? '#FFF8D6'
                    : isToday
                    ? '#E8EFE6'
                    : '#F5F9F7',
                  border: isExpanded 
                    ? '2px solid #006747'
                    : isDragOver
                    ? '2px dashed #FFD700'
                    : isToday
                    ? '2px solid #006747'
                    : '2px solid transparent',
                  position: 'relative',
                  zIndex: isExpanded ? 10 : undefined,
                  boxShadow: isExpanded ? '0 4px 12px rgba(0, 0, 0, 0.15)' : undefined,
                }}
              >
                {/* Day number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? '#006747' : '#1A2E1A',
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Task and Event pills */}
                {(regularTasks.length > 0 || overdueTasks.length > 0 || events.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%', minWidth: 0 }}>
                    {/* Events with pink outline - shown first */}
                    {(isExpanded ? events : events.slice(0, 2)).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          if (!isExpanded) {
                            e.stopPropagation()
                            setExpandedDate(dayStr)
                          }
                        }}
                        style={{
                          fontSize: isExpanded ? '11px' : '10px',
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: isExpanded ? 600 : 500,
                          padding: isExpanded ? '8px 10px' : '2px 6px',
                          borderRadius: isExpanded ? '8px' : '20px',
                          backgroundColor: '#FFFFFF',
                          color: '#1A2E1A',
                          border: '1px solid #F78FB3',
                          whiteSpace: isExpanded ? 'normal' : ('nowrap' as const),
                          overflow: isExpanded ? 'visible' : 'hidden',
                          textOverflow: isExpanded ? 'clip' : 'ellipsis',
                          cursor: isExpanded ? 'default' : 'pointer',
                          display: 'flex',
                          flexDirection: 'row',
                          gap: isExpanded ? '8px' : 0,
                          alignItems: 'center',
                          flexWrap: isExpanded ? 'wrap' : 'nowrap',
                          wordWrap: isExpanded ? 'break-word' : 'normal',
                          wordBreak: isExpanded ? 'break-word' : 'normal',
                          maxWidth: '100%',
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = '#FFF5F8'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF'
                          }
                        }}
                      >
                        <div style={{ 
                          fontWeight: 600, 
                          flex: isExpanded ? '1 1 100%' : 1, 
                          minWidth: 0, 
                          overflow: isExpanded ? 'visible' : 'hidden', 
                          textOverflow: isExpanded ? 'clip' : 'ellipsis',
                          whiteSpace: isExpanded ? 'normal' : 'nowrap',
                          wordWrap: isExpanded ? 'break-word' : 'normal',
                          wordBreak: isExpanded ? 'break-word' : 'normal',
                          maxWidth: isExpanded ? '100%' : 'none',
                        }}>
                          {event.text}
                        </div>
                        {isExpanded && (
                          <>
                            <div
                              style={{
                                fontSize: '9px',
                                color: '#5A7A5E',
                                fontWeight: 400,
                                flexShrink: 0,
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
                                  fontSize: '9px',
                                  color: '#5A7A5E',
                                  fontStyle: 'italic',
                                  fontWeight: 400,
                                  flexShrink: 0,
                                }}
                              >
                                📍 {event.location}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {/* Regular tasks with green outline - shown after events */}
                    {(isExpanded ? regularTasks : regularTasks.slice(0, Math.max(0, 2 - events.length))).map((task) => {
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: '10px',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '20px',
                            backgroundColor: '#FFFFFF',
                            color: '#1A2E1A',
                            border: '1px solid #006747',
                            whiteSpace: 'nowrap' as const,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            opacity: task.completed ? 0.5 : 1,
                            cursor: 'grab',
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.cursor = 'grabbing'
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.cursor = 'grab'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.cursor = 'grab'
                          }}
                        >
                          {task.text}
                        </div>
                      )
                    })}
                    {/* Overdue tasks with pink outline - shown at the bottom */}
                    {(isExpanded ? overdueTasks : overdueTasks.slice(0, Math.max(0, 2 - events.length - regularTasks.length))).map((task) => {
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: '10px',
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '20px',
                            backgroundColor: '#FDE8EF',
                            color: '#F78FB3',
                            border: '1px solid #F78FB3',
                            whiteSpace: 'nowrap' as const,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            opacity: task.completed ? 0.5 : 1,
                            cursor: 'grab',
                          }}
                          onMouseDown={(e) => {
                            e.currentTarget.style.cursor = 'grabbing'
                          }}
                          onMouseUp={(e) => {
                            e.currentTarget.style.cursor = 'grab'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.cursor = 'grab'
                          }}
                        >
                          {task.text}
                        </div>
                      )
                    })}
                    {hasMore && !isExpanded && (
                      <div
                        data-expand-trigger
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '10px',
                          color: '#006747',
                          paddingLeft: '4px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none'
                        }}
                      >
                        +{totalItems - 2} more
                      </div>
                    )}
                    {isExpanded && (
                      <button
                        data-collapse-button
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '10px',
                          color: '#006747',
                          paddingLeft: '4px',
                          marginTop: '4px',
                          cursor: 'pointer',
                          background: 'none',
                          border: 'none',
                          textAlign: 'left',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none'
                        }}
                      >
                        Collapse
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Event Creation Popup */}
      {/* Choice Dialog */}
      {showChoiceDialog && (
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
          onClick={handleCloseChoiceDialog}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '18px',
                fontWeight: 600,
                color: '#1A2E1A',
                margin: '0 0 20px 0',
                textAlign: 'center',
              }}
            >
              What would you like to create?
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleChoiceEvent}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#006747',
                  color: '#FFFFFF',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#004d33')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#006747')}
              >
                Create Event
              </button>
              <button
                onClick={handleChoiceTask}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E8EFE6',
                  backgroundColor: '#FFFFFF',
                  color: '#006747',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8EFE6'
                  e.currentTarget.style.borderColor = '#006747'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF'
                  e.currentTarget.style.borderColor = '#E8EFE6'
                }}
              >
                Create Task (Due This Day)
              </button>
              <button
                onClick={handleCloseChoiceDialog}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#5A7A5E',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1A2E1A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Creation Popup */}
      {showTaskPopup && (
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
          onClick={handleCloseTaskPopup}
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
                Create Task
              </h2>
              <button
                onClick={handleCloseTaskPopup}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  Task
                </label>
                <input
                  type="text"
                  value={taskFormData.text}
                  onChange={(e) => setTaskFormData({ text: e.target.value })}
                  placeholder="Task description"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E8EFE6',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#1A2E1A',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTask()
                    } else if (e.key === 'Escape') {
                      handleCloseTaskPopup()
                    }
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: '#5A7A5E',
                  fontStyle: 'italic',
                  marginTop: '-4px',
                }}
              >
                Due: {taskPopupDate ? format(taskPopupDate, 'EEEE, MMMM d, yyyy') : ''}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={handleCloseTaskPopup}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #E8EFE6',
                    backgroundColor: 'transparent',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: '#5A7A5E',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#006747'
                    e.currentTarget.style.color = '#006747'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E8EFE6'
                    e.currentTarget.style.color = '#5A7A5E'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!taskFormData.text.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: taskFormData.text.trim() ? '#006747' : '#C8D5C2',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: '#FFFFFF',
                    cursor: taskFormData.text.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    if (taskFormData.text.trim()) {
                      e.currentTarget.style.backgroundColor = '#004d33'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (taskFormData.text.trim()) {
                      e.currentTarget.style.backgroundColor = '#006747'
                    }
                  }}
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEventPopup && (
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
          onClick={handleCloseEventPopup}
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
                Create Event
              </h2>
              <button
                onClick={handleCloseEventPopup}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  value={eventFormData.title}
                  onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                  placeholder="Event title"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E8EFE6',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#1A2E1A',
                    outline: 'none',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateEvent()
                    } else if (e.key === 'Escape') {
                      handleCloseEventPopup()
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
                    marginBottom: '4px',
                  }}
                >
                  Date
                </label>
                <input
                  type="date"
                  value={eventFormData.date}
                  onChange={(e) => setEventFormData({ ...eventFormData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E8EFE6',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#1A2E1A',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  id="allDay"
                  checked={eventFormData.allDay}
                  onChange={(e) => setEventFormData({ ...eventFormData, allDay: e.target.checked })}
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

              {!eventFormData.allDay && (
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
                    value={eventFormData.startHour}
                    onChange={(e) => setEventFormData({ ...eventFormData, startHour: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
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
                    value={eventFormData.endHour}
                    onChange={(e) => setEventFormData({ ...eventFormData, endHour: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
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
                  value={eventFormData.location}
                  onChange={(e) => setEventFormData({ ...eventFormData, location: e.target.value })}
                  placeholder="Location"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #E8EFE6',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#1A2E1A',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={handleCloseEventPopup}
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
                  onClick={handleCreateEvent}
                  disabled={!eventFormData.title.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: eventFormData.title.trim() ? '#006747' : '#C8D5C2',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: '#FFFFFF',
                    cursor: eventFormData.title.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 500,
                  }}
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date change confirmation popup — use portal to render at document.body level */}
      {showDateChangeConfirm && typeof window !== 'undefined' && pendingDate && createPortal(
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
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDateChangeConfirm(false)
              setPendingTaskId(null)
              setPendingDate(null)
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 24px rgba(0, 40, 25, 0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '16px',
                fontWeight: 600,
                color: '#1A2E1A',
                marginBottom: '12px',
              }}
            >
              Change due date?
            </h3>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#5A7A5E',
                marginBottom: '20px',
              }}
            >
              Set {format(pendingDate, 'MMM d')} as the new due date?
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDateChangeConfirm(false)
                  setPendingTaskId(null)
                  setPendingDate(null)
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #E8EFE6',
                  backgroundColor: 'transparent',
                  color: '#5A7A5E',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F9F7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  confirmDateChange()
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#006747',
                  color: '#FFFFFF',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#005238'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#006747'
                }}
              >
                Change Date
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}