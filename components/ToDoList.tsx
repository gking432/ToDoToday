'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar as CalendarIcon, Plus, List, Edit2, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { Task, Subtask } from '@/types'
import { useStore } from '@/hooks/useStore'
import { getDaysUntilDue, isOverdue, formatDate, wasCompletedToday, getTasksForDate } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarPopup } from './CalendarPopup'

export function ToDoList() {
  const store = useStore()
  const [newTaskText, setNewTaskText] = useState('')
  const [newSubtasks, setNewSubtasks] = useState<Subtask[]>([])
  const [showInput, setShowInput] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
  const [editingPriority, setEditingPriority] = useState<string | null>(null)
  const [editingDueDate, setEditingDueDate] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTaskText, setEditingTaskText] = useState('')
  const [editingSubtasks, setEditingSubtasks] = useState<Subtask[]>([])
  const editingSubtaskInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [sortMode, setSortMode] = useState<'createdAsc' | 'createdDesc' | 'dueDate'>(() => {
    // Load sort mode from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('todoSortMode')
      if (saved === 'createdAsc' || saved === 'createdDesc' || saved === 'dueDate') {
        return saved
      }
      // Handle legacy 'created' value - default to ascending
      if (saved === 'created') {
        return 'createdAsc'
      }
    }
    return 'createdAsc' // Default
  })
  const [showFilterPopup, setShowFilterPopup] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const subtaskInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Today's date string - used for recurring task instance tracking
  const todayStr = formatDate(new Date())

  // Filter out tasks completed before today (midnight reset)
  // Keep tasks that are either not completed OR completed today (they stay visible until next day)
  // For recurring tasks, check if today's instance is completed
  const todayTasks = store.tasks.filter((t) => {
    if (t.recurrence && t.dueDate) {
      // For recurring tasks, check if today's instance is completed
      const isTodayCompleted = t.completedDates?.includes(todayStr) || false
      // Show if today's instance is not completed, or if it was completed today (to show strikethrough)
      return !isTodayCompleted || t.completedDates?.includes(todayStr)
    }
    // For non-recurring tasks, use standard logic
    if (!t.completed) return true
    return wasCompletedToday(t.completedAt)
  })
  
  // For recurring tasks in the list, check completion status for today's instance
  const { matchesRecurrence } = require('@/lib/utils')
  const todayTasksWithInstanceStatus = todayTasks.map(task => {
    if (task.recurrence && task.dueDate) {
      // Check if today matches the recurrence pattern
      const todayMatches = matchesRecurrence(todayStr, task.dueDate, task.recurrence)
      if (todayMatches) {
        const isTodayCompleted = task.completedDates?.includes(todayStr) || false
        return { ...task, completed: isTodayCompleted, dueDate: todayStr, parentTaskId: task.id }
      }
      // If today doesn't match, don't show this recurring task
      return null
    }
    return task
  }).filter((task): task is typeof task & { id: string } => task !== null)
  
  // Sort tasks based on selected sort mode
  // Note: Drag and drop always updates the order property, regardless of current filter
  const sortedTasks = [...todayTasksWithInstanceStatus].sort((a, b) => {
    if (sortMode === 'createdAsc') {
      // Sort by creation date (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else if (sortMode === 'createdDesc') {
      // Sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    } else if (sortMode === 'dueDate') {
      // Sort by due date: overdue first, then soonest due dates, then no due date last
      if (!a.dueDate && !b.dueDate) return a.order - b.order // Both have no due date, use order
      if (!a.dueDate) return 1 // a has no due date, put it last
      if (!b.dueDate) return -1 // b has no due date, put it last
      
      const aOverdue = isOverdue(a.dueDate)
      const bOverdue = isOverdue(b.dueDate)
      
      if (aOverdue && !bOverdue) return -1 // a is overdue, b is not
      if (!aOverdue && bOverdue) return 1 // b is overdue, a is not
      if (aOverdue && bOverdue) {
        // Both overdue, sort by how overdue (most overdue first)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      }
      
      // Neither overdue, sort by due date (soonest first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    return a.order - b.order
  })
  // Show both active and completed tasks (completed tasks stay visible until next day)
  const allTasks = sortedTasks

  // Focus input when it becomes visible
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  const handlePlusClick = () => {
    setShowInput(true)
  }

  const handleAddTask = () => {
    if (newTaskText.trim()) {
      const taskId = store.addTask(newTaskText.trim(), newSubtasks.length > 0 ? newSubtasks : undefined)
      setNewTaskText('')
      setNewSubtasks([])
      setShowInput(false)
      // Show calendar popup for due date
      setPendingTaskId(taskId)
      setShowCalendar(true)
    }
  }

  const handleAddSubtask = () => {
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: '',
      completed: false,
    }
    setNewSubtasks([...newSubtasks, newSubtask])
    // Focus the new subtask input after it renders
    setTimeout(() => {
      const lastIndex = newSubtasks.length
      subtaskInputRefs.current[lastIndex]?.focus()
    }, 0)
  }

  const handleSubtaskChange = (index: number, text: string) => {
    const updated = [...newSubtasks]
    updated[index] = { ...updated[index], text }
    setNewSubtasks(updated)
  }

  const handleSubtaskKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // SHIFT+ENTER: Add a new bullet point (or move to next)
      e.preventDefault()
      if (index === newSubtasks.length - 1) {
        // Last subtask, add a new one
        handleAddSubtask()
      } else {
        // Focus next subtask
        subtaskInputRefs.current[index + 1]?.focus()
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // ENTER: Create the task
      e.preventDefault()
      handleAddTask()
    } else if (e.key === 'Backspace' && !newSubtasks[index].text && newSubtasks.length > 0) {
      // Remove empty subtask
      const updated = newSubtasks.filter((_, i) => i !== index)
      setNewSubtasks(updated)
      // Focus previous subtask or main input
      if (index > 0) {
        subtaskInputRefs.current[index - 1]?.focus()
      } else {
        inputRef.current?.focus()
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      subtaskInputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (index < newSubtasks.length - 1) {
        subtaskInputRefs.current[index + 1]?.focus()
      } else {
        handleAddSubtask()
      }
    }
  }

  const handleCalendarSelect = (date: string | null, recurrence?: any) => {
    if (pendingTaskId) {
      // Update the task's due date and recurrence (either new task or editing existing)
      store.updateTask(pendingTaskId, { dueDate: date, recurrence: recurrence || null })
      setPendingTaskId(null)
    }
    setShowCalendar(false)
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId)
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (!draggedTaskId) return
    
    // Get tasks sorted by ORDER (not by sort mode) for reordering
    const tasksByOrder = [...todayTasks].sort((a, b) => a.order - b.order)
    const activeTasks = tasksByOrder.filter((t) => !t.completed)
    const dragIndex = activeTasks.findIndex((t) => t.id === draggedTaskId)
    
    if (dragIndex === -1 || dragIndex === dropIndex) {
      setDragOverIndex(null)
      setDraggedTaskId(null)
      return
    }
    
    // Reorder active tasks
    const reorderedActive = [...activeTasks]
    const [moved] = reorderedActive.splice(dragIndex, 1)
    reorderedActive.splice(dropIndex, 0, moved)
    
    // Get completed tasks (they should maintain their relative order)
    const completedTasks = tasksByOrder.filter((t) => t.completed)
    
    // Combine: active tasks first (with new order), then completed tasks
    const allReordered = [
      ...reorderedActive.map((task, i) => ({ ...task, order: i })),
      ...completedTasks.map((task, i) => ({ ...task, order: reorderedActive.length + i }))
    ]
    
    // Use reorderTasks to update all tasks at once
    store.reorderTasks(allReordered)
    setDragOverIndex(null)
    setDraggedTaskId(null)
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverIndex(null)
  }

  // Close filter popup when clicking outside
  useEffect(() => {
    if (!showFilterPopup) return
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Check if click is outside the filter button and popup
      const filterButton = target.closest('button[data-filter-button]')
      const popup = target.closest('[data-filter-popup]')
      if (!filterButton && !popup) {
        setShowFilterPopup(false)
      }
    }
    
    // Use a small delay to avoid closing immediately when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopup])

  return (
    <>
      <div className="flex flex-col h-full" style={{ position: 'relative' }}>
        {/* Green header band */}
        <div className="card-header flex-shrink-0" style={{ position: 'relative' }}>
          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>To-Do</h2>
            
            <div className="flex items-center gap-2">
              {/* Filter button */}
              <button
                data-filter-button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowFilterPopup(!showFilterPopup)
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: showFilterPopup ? '#C8D5C2' : '#E8EFE6',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#006747',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!showFilterPopup) {
                    e.currentTarget.style.backgroundColor = '#C8D5C2'
                    e.currentTarget.style.transform = 'scale(1.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showFilterPopup) {
                    e.currentTarget.style.backgroundColor = '#E8EFE6'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
              >
                <SlidersHorizontal size={18} strokeWidth={2.5} />
              </button>
              
              {/* Plus button — always visible */}
              <button
                onClick={handlePlusClick}
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
          
          {/* Filter popup */}
          {showFilterPopup && (
            <div
              data-filter-popup
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '100%',
                right: '16px',
                marginTop: '8px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '12px',
                zIndex: 1000,
                minWidth: '200px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1A2E1A',
                  }}
                >
                  Sort by:
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => {
                    setSortMode('createdAsc')
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('todoSortMode', 'createdAsc')
                    }
                    setShowFilterPopup(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: sortMode === 'createdAsc' ? '#E8EFE6' : 'transparent',
                    color: sortMode === 'createdAsc' ? '#006747' : '#1A2E1A',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: sortMode === 'createdAsc' ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (sortMode !== 'createdAsc') {
                      e.currentTarget.style.backgroundColor = '#F5F9F7'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortMode !== 'createdAsc') {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  Date Created (Oldest First)
                </button>
                <button
                  onClick={() => {
                    setSortMode('createdDesc')
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('todoSortMode', 'createdDesc')
                    }
                    setShowFilterPopup(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: sortMode === 'createdDesc' ? '#E8EFE6' : 'transparent',
                    color: sortMode === 'createdDesc' ? '#006747' : '#1A2E1A',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: sortMode === 'createdDesc' ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (sortMode !== 'createdDesc') {
                      e.currentTarget.style.backgroundColor = '#F5F9F7'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortMode !== 'createdDesc') {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  Date Created (Newest First)
                </button>
                <button
                  onClick={() => {
                    setSortMode('dueDate')
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('todoSortMode', 'dueDate')
                    }
                    setShowFilterPopup(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: sortMode === 'dueDate' ? '#E8EFE6' : 'transparent',
                    color: sortMode === 'dueDate' ? '#006747' : '#1A2E1A',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: sortMode === 'dueDate' ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (sortMode !== 'dueDate') {
                      e.currentTarget.style.backgroundColor = '#F5F9F7'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortMode !== 'dueDate') {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  Due Date
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Task list — white body, scrollable */}
      <div 
        className="flex-1 overflow-y-auto" 
        style={{ padding: '12px 10px' }}
        onDragOver={(e) => {
          // Allow drop on the container
          if (draggedTaskId) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDrop={(e) => {
          // Fallback: if drop happens on container (not on a task), drop at the end
          e.preventDefault()
          if (draggedTaskId) {
            const activeTasks = allTasks.filter((t) => !t.completed)
            const dragIndex = activeTasks.findIndex((t) => t.id === draggedTaskId)
            if (dragIndex !== -1) {
              handleDrop(e, activeTasks.length - 1)
            }
          }
        }}
      >

        {/* All tasks (active and completed) */}
        {allTasks.map((task, index) => (
          <div
            key={task.id}
            draggable={!task.completed}
            onDragStart={(e) => {
              if (!task.completed) {
                handleDragStart(e, task.id)
              } else {
                e.preventDefault()
              }
            }}
            onDragOver={(e) => {
              // Only allow drag over if dragging an active task
              if (draggedTaskId && !task.completed) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                // Calculate the index in activeTasks only
                const activeTasks = allTasks.filter((t) => !t.completed)
                const activeIndex = activeTasks.findIndex((t) => t.id === task.id)
                if (activeIndex !== -1) {
                  setDragOverIndex(activeIndex)
                }
              }
            }}
            onDrop={(e) => {
              // Only allow drop if not completed
              if (!task.completed && draggedTaskId) {
                // Get tasks sorted by ORDER (not by sort mode) to match handleDrop logic
                const tasksByOrder = [...todayTasks].sort((a, b) => a.order - b.order)
                const activeTasks = tasksByOrder.filter((t) => !t.completed)
                const activeDropIndex = activeTasks.findIndex((t) => t.id === task.id)
                if (activeDropIndex !== -1) {
                  handleDrop(e, activeDropIndex)
                }
              }
            }}
            onDragEnd={handleDragEnd}
            style={{
              opacity: draggedTaskId === task.id ? 0.35 : 1,
              borderBottom:
                dragOverIndex === index && draggedTaskId !== task.id
                  ? '2px solid #FFD700'
                  : '2px solid transparent',
              transition: 'opacity 0.15s, border-color 0.15s',
            }}
          >
            <TaskRow
              task={task}
              store={store}
              editingPriority={editingPriority}
              setEditingPriority={setEditingPriority}
              editingDueDate={editingDueDate}
              setEditingDueDate={setEditingDueDate}
              editingTaskId={editingTaskId}
              setEditingTaskId={setEditingTaskId}
              editingTaskText={editingTaskText}
              setEditingTaskText={setEditingTaskText}
              editingSubtasks={editingSubtasks}
              setEditingSubtasks={setEditingSubtasks}
              editingSubtaskInputRefs={editingSubtaskInputRefs}
              setPendingTaskId={setPendingTaskId}
              setShowCalendar={setShowCalendar}
              todayStr={todayStr}
            />
          </div>
        ))}


        {/* Empty state — only show when no tasks and input is not visible */}
        {sortedTasks.length === 0 && !showInput && (
          <div
            className="text-center py-10"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: '#5A7A5E',
            }}
          >
            No tasks yet.
          </div>
        )}

        {/* Input — ALWAYS in task list area, appears as green line when plus is clicked */}
        {showInput && (
          <div style={{ padding: '8px 2.5px', marginTop: sortedTasks.length > 0 ? '4px' : '0' }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    handleAddTask()
                  } else if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault()
                    handleAddSubtask()
                  } else if (e.key === 'ArrowDown' && newSubtasks.length > 0) {
                    e.preventDefault()
                    subtaskInputRefs.current[0]?.focus()
                  } else if (e.key === 'Escape') {
                    setShowInput(false)
                    setNewTaskText('')
                    setNewSubtasks([])
                  }
                }}
                onBlur={() => {
                  // Don't hide on blur if there's text or subtasks
                  if (!newTaskText.trim() && newSubtasks.length === 0) {
                    setShowInput(false)
                  }
                }}
                placeholder=""
                autoFocus
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  width: '100%',
                  padding: '4px 32px 4px 0',
                  border: 'none',
                  borderBottom: '2px solid #006747',
                  backgroundColor: 'transparent',
                  color: '#1A2E1A',
                  outline: 'none',
                  caretColor: '#006747',
                }}
              />
              <button
                onClick={handleAddSubtask}
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
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
                title="Add bullet point (Shift+Enter or ↓)"
              >
                <List size={16} />
              </button>
            </div>
            {/* Subtasks */}
            {newSubtasks.length > 0 && (
              <div style={{ marginTop: '8px', marginLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {newSubtasks.map((subtask, index) => (
                  <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#5A7A5E', fontSize: '12px' }}>•</span>
                    <input
                      ref={(el) => {
                        subtaskInputRefs.current[index] = el
                      }}
                      type="text"
                      value={subtask.text}
                      onChange={(e) => handleSubtaskChange(index, e.target.value)}
                      onKeyDown={(e) => handleSubtaskKeyDown(e, index)}
                      placeholder="Bullet point"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '12px',
                        flex: 1,
                        padding: '2px 0',
                        border: 'none',
                        borderBottom: '1px solid #E8EFE6',
                        backgroundColor: 'transparent',
                        color: '#1A2E1A',
                        outline: 'none',
                        caretColor: '#006747',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Calendar popup */}
    {showCalendar && (
      <CalendarPopup
        onSelectDate={handleCalendarSelect}
        onClose={() => {
          setShowCalendar(false)
          setPendingTaskId(null)
        }}
        allowRecurrence={true}
        initialDate={pendingTaskId ? store.tasks.find(t => t.id === pendingTaskId)?.dueDate || null : null}
        initialRecurrence={pendingTaskId ? store.tasks.find(t => t.id === pendingTaskId)?.recurrence || null : null}
      />
    )}
    </>
  )
}

// ---------------------------------------------------------------------------
// TaskRow
// ---------------------------------------------------------------------------

function getDueDateStatus(task: Task): 'overdue' | 'today' | 'soon' | 'future' | null {
  if (!task.dueDate) return null
  if (task.completed) return null
  if (isOverdue(task.dueDate)) return 'overdue'
  const days = getDaysUntilDue(task.dueDate)
  if (days === 0) return 'today'
  if (days !== null && days <= 3) return 'soon'
  return 'future'
}


interface TaskRowProps {
  task: Task
  store: ReturnType<typeof useStore>
  editingPriority: string | null
  setEditingPriority: (id: string | null) => void
  editingDueDate: string | null
  setEditingDueDate: (id: string | null) => void
  editingTaskId: string | null
  setEditingTaskId: (id: string | null) => void
  editingTaskText: string
  setEditingTaskText: (text: string) => void
  editingSubtasks: Subtask[]
  setEditingSubtasks: (subtasks: Subtask[]) => void
  editingSubtaskInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>
  setPendingTaskId: (id: string | null) => void
  setShowCalendar: (show: boolean) => void
  todayStr: string
}

// Note: editingPriority is kept in props for compatibility but not used

function TaskRow({
  task,
  store,
  editingPriority,
  setEditingPriority,
  editingDueDate,
  setEditingDueDate,
  editingTaskId,
  setEditingTaskId,
  editingTaskText,
  setEditingTaskText,
  editingSubtasks,
  setEditingSubtasks,
  editingSubtaskInputRefs,
  setPendingTaskId,
  setShowCalendar,
  todayStr,
}: TaskRowProps) {
  const [hovered, setHovered] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editInputRef, setEditInputRef] = useState<HTMLInputElement | null>(null)
  const editingContainerRef = useRef<HTMLDivElement | null>(null)
  const dueStatus = getDueDateStatus(task)
  const isEditing = editingTaskId === task.id

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef) {
      editInputRef.focus()
      editInputRef.select()
    }
  }, [isEditing, editInputRef])

  const handleStartEdit = () => {
    setEditingTaskText(task.text)
    // Always add a blank bullet point input when editing
    const existingSubtasks = task.subtasks ? [...task.subtasks] : []
    const blankSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: '',
      completed: false,
    }
    setEditingSubtasks([...existingSubtasks, blankSubtask])
    setEditingTaskId(task.id)
    setShowActions(true) // Show calendar and delete buttons when editing starts
  }

  const handleSaveEdit = (e?: React.FocusEvent) => {
    // Use a small timeout to check if focus moved to another input in the editing area
    setTimeout(() => {
      const activeElement = document.activeElement as HTMLElement
      // Check if focus is still within the editing container
      if (editingContainerRef.current && editingContainerRef.current.contains(activeElement)) {
        return // Don't save, focus is still within editing area
      }
      
      // Focus moved outside, save the edit
      if (editingTaskText.trim()) {
        // Filter out empty subtasks before saving
        const validSubtasks = editingSubtasks.filter(s => s.text.trim())
        store.updateTask(task.id, { 
          text: editingTaskText.trim(),
          subtasks: validSubtasks.length > 0 ? validSubtasks : undefined
        })
      }
      setEditingTaskId(null)
      setEditingTaskText('')
      setEditingSubtasks([])
    }, 0)
  }

  const handleCancelEdit = () => {
    setEditingTaskId(null)
    setEditingTaskText('')
    setEditingSubtasks([])
  }

  const handleAddEditingSubtask = () => {
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      text: '',
      completed: false,
    }
    setEditingSubtasks([...editingSubtasks, newSubtask])
    // Focus the new subtask input after it renders
    setTimeout(() => {
      const lastIndex = editingSubtasks.length
      editingSubtaskInputRefs.current[lastIndex]?.focus()
    }, 0)
  }

  const handleEditingSubtaskChange = (index: number, text: string) => {
    const updated = [...editingSubtasks]
    updated[index] = { ...updated[index], text }
    setEditingSubtasks(updated)
  }

  const handleEditingSubtaskKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // SHIFT+ENTER: Add a new bullet point (or move to next)
      e.preventDefault()
      if (index === editingSubtasks.length - 1) {
        // Last subtask, add a new one
        handleAddEditingSubtask()
      } else {
        // Focus next subtask
        editingSubtaskInputRefs.current[index + 1]?.focus()
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // ENTER: Save the task
      e.preventDefault()
      handleSaveEdit()
    } else if (e.key === 'Backspace' && !editingSubtasks[index].text && editingSubtasks.length > 0) {
      // Remove empty subtask
      e.preventDefault()
      const updated = editingSubtasks.filter((_, i) => i !== index)
      setEditingSubtasks(updated)
      // Focus previous subtask or main input
      if (index > 0) {
        editingSubtaskInputRefs.current[index - 1]?.focus()
      } else {
        editInputRef?.focus()
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault()
      editingSubtaskInputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (index < editingSubtasks.length - 1) {
        editingSubtaskInputRefs.current[index + 1]?.focus()
      } else {
        handleAddEditingSubtask()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  // Overdue tasks get a pink left border + pink tinted background
  const isOverdueTask = dueStatus === 'overdue'

  return (
          <div
            className="flex gap-2.5 py-2 px-2.5 rounded-lg"
            style={{
              opacity: task.completed ? 0.45 : 1,
              backgroundColor: isOverdueTask
                ? '#FDE8EF'
                : hovered && !task.completed
                ? '#F5F9F7'
                : 'transparent',
              borderLeft: isOverdueTask ? '3px solid #F78FB3' : '3px solid transparent',
              transition: 'background-color 0.15s',
            }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        // Reset showActions when mouse leaves, but only if not editing
        if (!isEditing) {
          setShowActions(false)
        }
      }}
    >
      {/* Content — clickable to toggle completion, or editable if editing */}
      <div 
        className="flex-1 min-w-0"
      >
        {isEditing ? (
          <div ref={editingContainerRef} className="editing-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                ref={setEditInputRef}
                type="text"
                value={editingTaskText}
                onChange={(e) => setEditingTaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveEdit()
                  } else if (e.key === 'Enter' && e.shiftKey) {
                    e.preventDefault()
                    handleAddEditingSubtask()
                  } else if (e.key === 'ArrowDown' && editingSubtasks.length > 0) {
                    e.preventDefault()
                    editingSubtaskInputRefs.current[0]?.focus()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    handleCancelEdit()
                  }
                }}
                onBlur={(e) => handleSaveEdit(e)}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  width: '100%',
                  padding: '2px 28px 2px 4px',
                  border: '1px solid #006747',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  color: '#1A2E1A',
                  outline: 'none',
                  caretColor: '#006747',
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAddEditingSubtask()
                }}
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
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
                title="Add bullet point (Shift+Enter or ↓)"
              >
                <List size={16} />
              </button>
            </div>
            {/* Editing subtasks */}
            {editingSubtasks.length > 0 && (
              <div style={{ marginLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {editingSubtasks.map((subtask, index) => (
                  <div key={subtask.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#5A7A5E', fontSize: '12px' }}>•</span>
                    <input
                      ref={(el) => {
                        editingSubtaskInputRefs.current[index] = el
                      }}
                      type="text"
                      value={subtask.text}
                      onChange={(e) => handleEditingSubtaskChange(index, e.target.value)}
                      onKeyDown={(e) => handleEditingSubtaskKeyDown(e, index)}
                      onBlur={(e) => {
                        // Use the same save logic - it will check if focus is still in editing area
                        handleSaveEdit(e)
                      }}
                      placeholder="Bullet point"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '12px',
                        flex: 1,
                        padding: '2px 0',
                        border: 'none',
                        borderBottom: '1px solid #E8EFE6',
                        backgroundColor: 'transparent',
                        color: '#1A2E1A',
                        outline: 'none',
                        caretColor: '#006747',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => {
              // For recurring tasks, use today's date as instance date
              const instanceDate = task.parentTaskId ? task.dueDate : (task.recurrence ? todayStr : undefined)
              store.updateTask(task.parentTaskId || task.id, { completed: !task.completed }, instanceDate || undefined)
            }}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: task.completed ? '#5A7A5E' : '#1A2E1A',
              textDecoration: task.completed ? 'line-through' : 'none',
              lineHeight: '1.4',
            }}
          >
            {task.text}
          </div>
        )}
        
        {/* Subtasks — only show when not editing */}
        {!isEditing && task.subtasks && task.subtasks.length > 0 && (
          <div style={{ marginTop: '6px', marginLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {task.subtasks.map((subtask) => (
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#5A7A5E', fontSize: '12px' }}>•</span>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: subtask.completed ? '#5A7A5E' : '#1A2E1A',
                    textDecoration: subtask.completed ? 'line-through' : 'none',
                    lineHeight: '1.4',
                  }}
                >
                  {subtask.text}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Due date indicator — only show if not completed */}
        {task.dueDate && dueStatus && (
          <div className="mt-1">
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 500,
                color:
                  dueStatus === 'overdue' || dueStatus === 'today'
                    ? '#F78FB3'
                    : dueStatus === 'soon'
                    ? '#B8860B'
                    : '#5A7A5E',
              }}
            >
              {(dueStatus === 'overdue' || dueStatus === 'today' || dueStatus === 'soon') && (
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor:
                      dueStatus === 'overdue' || dueStatus === 'today'
                        ? '#F78FB3'
                        : '#FFD700',
                  }}
                />
              )}
              {dueStatus === 'overdue' && `Overdue · ${format(new Date(task.dueDate), 'MMM d')}`}
              {dueStatus === 'today' && 'Due today'}
              {dueStatus === 'soon' &&
                `Due in ${getDaysUntilDue(task.dueDate)} day${getDaysUntilDue(task.dueDate) === 1 ? '' : 's'}`}
              {dueStatus === 'future' && `Due ${format(new Date(task.dueDate), 'MMM d')}`}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons on hover — Edit button always visible on hover, Calendar and X appear when editing */}
      {hovered && !task.completed && !isEditing && (
        <div className="flex items-start gap-1 flex-shrink-0" style={{ paddingTop: '2px' }}>
          {/* Edit icon — always shown on hover */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              // Immediately start editing and show calendar/delete buttons
              handleStartEdit()
            }}
            className="p-1 rounded-md"
            style={{ color: '#5A7A5E', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
            title="Edit task"
          >
            <Edit2 size={13} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Calendar and Delete buttons — shown when editing */}
      {isEditing && !task.completed && (
        <div className="flex items-start gap-1 flex-shrink-0" style={{ paddingTop: '2px' }}>
          {/* Calendar icon for due date */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setPendingTaskId(task.id)
              setShowCalendar(true)
            }}
            className="p-1 rounded-md"
            style={{ color: '#5A7A5E', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
          >
            <CalendarIcon size={13} strokeWidth={1.8} />
          </button>

          {/* Trash icon to delete task */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            className="p-1 rounded-md"
            style={{ color: '#5A7A5E', background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#F78FB3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
          >
            <Trash2 size={13} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* Delete confirmation popup — use portal to render at document.body level */}
      {showDeleteConfirm && typeof window !== 'undefined' && createPortal(
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
              setShowDeleteConfirm(false)
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
              Are you sure you want to delete?
            </h3>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#5A7A5E',
                marginBottom: '20px',
              }}
            >
              This task will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
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
                  store.deleteTask(task.id)
                  setShowDeleteConfirm(false)
                  setShowActions(false)
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
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}