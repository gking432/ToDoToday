'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Plus, Minus } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate, isOverdue, getDaysUntilDue, getTasksForDate } from '@/lib/utils'
import type { Task } from '@/types'

interface DueItemsSummaryProps {
  date: Date
}

export function DueItemsSummary({ date }: DueItemsSummaryProps) {
  const store = useStore()
  const dateStr = formatDate(date)
  const isToday = formatDate(new Date()) === dateStr
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  // Get all tasks for this date (including recurring)
  const tasksForDate = getTasksForDate(store.tasks, date)
  
  // Separate overdue tasks - check original due dates, not instances
  const overdueTasks = store.tasks.filter((task) => {
    if (!task.dueDate) return false
    if (task.completed) return false
    if (task.parentTaskId) return false // Skip instances
    return isOverdue(task.dueDate)
  })

  // Due today - includes both completed and incomplete tasks, including recurring instances
  const dueTasks = tasksForDate.filter((task) => {
    // Only show tasks due on this specific date (not overdue)
    if (!task.dueDate) return false
    return !isOverdue(task.dueDate)
  })

  // Upcoming tasks - due in next 7 days (excluding today and overdue)
  // Generate dates for next 7 days and check for recurring tasks
  const upcomingTasks: Task[] = []
  const today = new Date()
  
  // Get the parent task IDs that are already in "Due Today" (for recurring tasks)
  const dueTodayParentIds = new Set<string>()
  dueTasks.forEach(task => {
    // If it's a recurring instance, track the parent ID
    if (task.parentTaskId) {
      dueTodayParentIds.add(task.parentTaskId)
    } else if (task.recurrence) {
      // If it's the parent recurring task itself, track its ID
      dueTodayParentIds.add(task.id)
    }
  })
  
  for (let i = 1; i <= 7; i++) {
    const futureDate = new Date(today)
    futureDate.setDate(today.getDate() + i)
    const tasksForFutureDate = getTasksForDate<Task>(store.tasks, futureDate)
    for (const task of tasksForFutureDate) {
      if (task.completed) continue
      if (isOverdue(task.dueDate || '')) continue
      
      // Skip if this recurring task is already in "Due Today"
      if (task.parentTaskId && dueTodayParentIds.has(task.parentTaskId)) {
        continue // This recurring task already appears in Due Today, skip from Upcoming
      }
      if (task.recurrence && !task.parentTaskId && dueTodayParentIds.has(task.id)) {
        continue // This recurring task (parent) already appears in Due Today, skip from Upcoming
      }
      
      // Avoid duplicates by checking id and parentTaskId combination
      const taskKey = `${task.id}-${task.parentTaskId || ''}`
      if (!upcomingTasks.some(t => `${t.id}-${t.parentTaskId || ''}` === taskKey)) {
        upcomingTasks.push(task)
      }
    }
  }
  
  // Sort by due date - nearest dates first
  upcomingTasks.sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0
    return a.dueDate.localeCompare(b.dueDate)
  })

  // If nothing in any section, show blank
  if (overdueTasks.length === 0 && dueTasks.length === 0 && upcomingTasks.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-4" style={{ width: '100%' }}>
      {/* Three columns: Due Today, Upcoming, Overdue */}
      <div className="flex gap-4" style={{ width: '100%' }}>
        {/* Due Today column */}
        <div className="flex-1 min-w-0">
          {dueTasks.length > 0 && (
            <>
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
                  Due {isToday ? 'Today' : format(date, 'MMM d')}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dueTasks.map((task) => {
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0
                  const isExpanded = expandedTasks.has(task.id)
                  return (
                    <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div
                          onClick={() => {
                            // For recurring tasks, use the instance date; for non-recurring, use the task's dueDate
                            const instanceDate = task.parentTaskId ? task.dueDate : (task.recurrence ? dateStr : undefined)
                            store.updateTask(task.parentTaskId || task.id, { completed: !task.completed }, instanceDate || undefined)
                          }}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '13px',
                            color: task.completed ? '#5A7A5E' : '#1A2E1A',
                            textDecoration: task.completed ? 'line-through' : 'none',
                            lineHeight: '1.4',
                            opacity: task.completed ? 0.6 : 1,
                            cursor: 'pointer',
                          }}
                        >
                          {task.text}
                        </div>
                        {hasSubtasks && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTaskExpansion(task.id)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: '#5A7A5E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
                          >
                            {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                          </button>
                        )}
                      </div>
                      {isExpanded && hasSubtasks && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '20px', marginTop: '4px' }}>
                          {task.subtasks?.map((subtask) => (
                            <div
                              key={subtask.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                const updatedSubtasks = task.subtasks?.map(s =>
                                  s.id === subtask.id ? { ...s, completed: !s.completed } : s
                                )
                                store.updateTask(task.id, { subtasks: updatedSubtasks })
                              }}
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '12px',
                                color: subtask.completed ? '#5A7A5E' : '#1A2E1A',
                                lineHeight: '1.4',
                                textDecoration: subtask.completed ? 'line-through' : 'none',
                                opacity: subtask.completed ? 0.6 : 1,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span style={{ color: '#5A7A5E', fontSize: '12px' }}>•</span>
                              <span>{subtask.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Upcoming column */}
        <div className="flex-1 min-w-0">
          {upcomingTasks.length > 0 && (
            <>
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
                  Upcoming
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {upcomingTasks.map((task) => {
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0
                  const isExpanded = expandedTasks.has(task.id)
                  return (
                    <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {task.dueDate && (() => {
                          // Parse date string (YYYY-MM-DD) using local date components to avoid timezone issues
                          const [year, month, day] = task.dueDate.split('-').map(Number)
                          const dueDate = new Date(year, month - 1, day)
                          return (
                            <div
                              className="inline-flex items-center"
                              style={{
                                backgroundColor: '#FFDF00',
                                color: '#1A2E1A',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '10px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '20px',
                                flexShrink: 0,
                              }}
                            >
                              {format(dueDate, 'MMM d')}
                            </div>
                          )
                        })()}
                        <div
                          onClick={() => {
                            // For recurring tasks, use the instance date (task.dueDate is already set to the instance date)
                            // For non-recurring tasks, instanceDate is undefined
                            const instanceDate = task.parentTaskId ? task.dueDate : (task.recurrence ? task.dueDate : undefined)
                            store.updateTask(task.parentTaskId || task.id, { completed: !task.completed }, instanceDate || undefined)
                          }}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '13px',
                            color: '#1A2E1A',
                            lineHeight: '1.4',
                            cursor: 'pointer',
                          }}
                        >
                          {task.text}
                        </div>
                        {hasSubtasks && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleTaskExpansion(task.id)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: '#5A7A5E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
                          >
                            {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                          </button>
                        )}
                      </div>
                      {isExpanded && hasSubtasks && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '20px', marginTop: '4px' }}>
                          {task.subtasks?.map((subtask) => (
                            <div
                              key={subtask.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                const updatedSubtasks = task.subtasks?.map(s =>
                                  s.id === subtask.id ? { ...s, completed: !s.completed } : s
                                )
                                store.updateTask(task.id, { subtasks: updatedSubtasks })
                              }}
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '12px',
                                color: subtask.completed ? '#5A7A5E' : '#1A2E1A',
                                lineHeight: '1.4',
                                textDecoration: subtask.completed ? 'line-through' : 'none',
                                opacity: subtask.completed ? 0.6 : 1,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span style={{ color: '#5A7A5E', fontSize: '12px' }}>•</span>
                              <span>{subtask.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Overdue section — at the bottom, only show when viewing today */}
      {isToday && overdueTasks.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          <div className="mb-3">
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '14px',
                fontWeight: 700,
                color: '#F78FB3',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Overdue
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {overdueTasks.map((task) => {
              const hasSubtasks = task.subtasks && task.subtasks.length > 0
              const isExpanded = expandedTasks.has(task.id)
              return (
                <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {task.dueDate && (() => {
                      // Parse date string (YYYY-MM-DD) using local date components to avoid timezone issues
                      const [year, month, day] = task.dueDate.split('-').map(Number)
                      const dueDate = new Date(year, month - 1, day)
                      return (
                        <div
                          className="inline-flex items-center"
                          style={{
                            backgroundColor: '#F78FB3',
                            color: '#FFFFFF',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '20px',
                            flexShrink: 0,
                          }}
                        >
                          {format(dueDate, 'MMM d')}
                        </div>
                      )
                    })()}
                    <div
                      onClick={() => {
                        // Overdue tasks are not recurring instances, use standard completion
                        store.updateTask(task.id, { completed: !task.completed })
                      }}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '13px',
                        color: '#1A2E1A',
                        lineHeight: '1.4',
                        cursor: 'pointer',
                      }}
                    >
                      {task.text}
                    </div>
                    {hasSubtasks && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTaskExpansion(task.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          color: '#5A7A5E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
                      >
                        {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                      </button>
                    )}
                  </div>
                  {isExpanded && hasSubtasks && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '20px', marginTop: '4px' }}>
                      {task.subtasks?.map((subtask) => (
                        <div
                          key={subtask.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            const updatedSubtasks = task.subtasks?.map(s =>
                              s.id === subtask.id ? { ...s, completed: !s.completed } : s
                            )
                            store.updateTask(task.id, { subtasks: updatedSubtasks })
                          }}
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '12px',
                            color: subtask.completed ? '#5A7A5E' : '#1A2E1A',
                            lineHeight: '1.4',
                            textDecoration: subtask.completed ? 'line-through' : 'none',
                            opacity: subtask.completed ? 0.6 : 1,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ color: '#5A7A5E', fontSize: '12px' }}>•</span>
                          <span>{subtask.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}