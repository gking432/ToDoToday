'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { Task, JournalEntry, Event, Subtask, Project } from '@/types'
import { formatDate } from '@/lib/utils'

const TASKS_KEY = 'todoToday_tasks'
const JOURNAL_KEY = 'todoToday_journal'
const EVENTS_KEY = 'todoToday_events'
const PROJECTS_KEY = 'todoToday_projects'

interface StoreContextType {
  tasks: Task[]
  journal: Record<string, JournalEntry>
  events: Event[]
  projects: Project[]
  addTask: (text: string, subtasks?: Subtask[], dueDate?: string, recurrence?: any) => string
  updateTask: (id: string, updates: Partial<Task>, instanceDate?: string) => void
  deleteTask: (id: string) => void
  reorderTasks: (newOrder: Task[]) => void
  clearCompleted: () => void
  saveJournalEntry: (date: string, content: string) => void
  getJournalEntry: (date: string) => JournalEntry | null
  getAllJournalEntries: () => JournalEntry[]
  addProject: (name: string) => string
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  saveProjectContent: (id: string, content: string) => void
  getProject: (id: string) => Project | null
  getAllProjects: () => Project[]
  addEvent: (text: string, date: string, hour: number, sourceTaskId?: string, endHour?: number, location?: string, minutes?: number, endMinutes?: number, allDay?: boolean) => string
  updateEvent: (id: string, updates: Partial<Event>) => void
  deleteEvent: (id: string) => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

function getStoredTasks(): Task[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(TASKS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function getStoredJournal(): Record<string, JournalEntry> {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(JOURNAL_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function getStoredEvents(): Event[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(EVENTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function getStoredProjects(): Project[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(PROJECTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [journal, setJournal] = useState<Record<string, JournalEntry>>({})
  const [events, setEvents] = useState<Event[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const storedTasks = getStoredTasks()
    // Add backward compatibility: ensure all tasks have completedAt field
    const normalizedTasks = storedTasks.map(task => ({
      ...task,
      completedAt: task.completedAt || (task.completed ? task.createdAt : null),
    }))
    // Save normalized tasks back to localStorage if any were updated
    if (normalizedTasks.some((task, i) => task.completedAt !== storedTasks[i]?.completedAt)) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TASKS_KEY, JSON.stringify(normalizedTasks))
      }
    }
    setTasks(normalizedTasks)
    setJournal(getStoredJournal())
    setEvents(getStoredEvents())
    setProjects(getStoredProjects())
  }, [])

  // Save tasks to localStorage
  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks))
    }
  }, [])

  // Save journal to localStorage
  const saveJournal = useCallback((newJournal: Record<string, JournalEntry>) => {
    setJournal(newJournal)
    if (typeof window !== 'undefined') {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(newJournal))
    }
  }, [])

  // Save events to localStorage
  const saveEvents = useCallback((newEvents: Event[]) => {
    setEvents(newEvents)
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(newEvents))
    }
  }, [])

  // Save projects to localStorage
  const saveProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects))
    }
  }, [])

  // Task operations
  const addTask = useCallback((text: string, subtasks?: Subtask[], dueDate?: string, recurrence?: any): string => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      completedAt: null,
      dueDate: dueDate || null,
      priority: null,
      scheduledSlots: [],
      createdAt: new Date().toISOString(),
      order: tasks.length,
      subtasks: subtasks && subtasks.length > 0 ? subtasks.filter(s => s.text.trim()) : undefined,
      recurrence: recurrence || null,
      parentTaskId: null,
    }
    saveTasks([...tasks, newTask])
    return newTask.id
  }, [tasks, saveTasks])

  const updateTask = useCallback((id: string, updates: Partial<Task>, instanceDate?: string) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === id) {
        const updated = { ...task, ...updates }
        
        // Handle completion for recurring vs non-recurring tasks
        if (updates.completed !== undefined) {
          if (task.recurrence && instanceDate) {
            // For recurring tasks, track completion per instance date
            const completedDates = task.completedDates || []
            if (updates.completed === true) {
              // Add this date to completedDates if not already there
              if (!completedDates.includes(instanceDate)) {
                updated.completedDates = [...completedDates, instanceDate]
              }
            } else {
              // Remove this date from completedDates
              updated.completedDates = completedDates.filter(d => d !== instanceDate)
            }
            // For recurring tasks, don't set the main completed flag
            // The instance completion is tracked in completedDates
          } else {
            // For non-recurring tasks, use the standard completion logic
            if (updates.completed === true && !task.completed) {
              updated.completedAt = new Date().toISOString()
            } else if (updates.completed === false && task.completed) {
              updated.completedAt = null
            }
          }
        }
        
        return updated
      }
      return task
    })
    saveTasks(updatedTasks)
  }, [tasks, saveTasks])

  const deleteTask = useCallback((id: string) => {
    saveTasks(tasks.filter(task => task.id !== id))
  }, [tasks, saveTasks])

  const reorderTasks = useCallback((newOrder: Task[]) => {
    const reordered = newOrder.map((task, index) => ({ ...task, order: index }))
    saveTasks(reordered)
  }, [saveTasks])

  const clearCompleted = useCallback(() => {
    saveTasks(tasks.filter(task => !task.completed))
  }, [tasks, saveTasks])

  // Journal operations
  const saveJournalEntry = useCallback((date: string, content: string) => {
    const newJournal = {
      ...journal,
      [date]: {
        date,
        content,
        updatedAt: new Date().toISOString(),
      },
    }
    saveJournal(newJournal)
  }, [journal, saveJournal])

  const getJournalEntry = useCallback((date: string): JournalEntry | null => {
    return journal[date] || null
  }, [journal])

  const getAllJournalEntries = useCallback((): JournalEntry[] => {
    return Object.values(journal).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [journal])

  // Project operations
  const addProject = useCallback((name: string): string => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || 'Untitled Project',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    saveProjects([...projects, newProject])
    return newProject.id
  }, [projects, saveProjects])

  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const updatedProjects = projects.map(project => {
      if (project.id === id) {
        return { 
          ...project, 
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      }
      return project
    })
    saveProjects(updatedProjects)
  }, [projects, saveProjects])

  const deleteProject = useCallback((id: string) => {
    saveProjects(projects.filter(project => project.id !== id))
  }, [projects, saveProjects])

  const saveProjectContent = useCallback((id: string, content: string) => {
    const updatedProjects = projects.map(project => {
      if (project.id === id) {
        return {
          ...project,
          content,
          updatedAt: new Date().toISOString(),
        }
      }
      return project
    })
    saveProjects(updatedProjects)
  }, [projects, saveProjects])

  const getProject = useCallback((id: string): Project | null => {
    return projects.find(project => project.id === id) || null
  }, [projects])

  const getAllProjects = useCallback((): Project[] => {
    return [...projects].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [projects])

  // Event operations
  const addEvent = useCallback((
    text: string, 
    date: string, 
    hour: number, 
    sourceTaskId?: string,
    endHour?: number,
    location?: string,
    minutes?: number,
    endMinutes?: number
  ): string => {
    const newEvent: Event = {
      id: crypto.randomUUID(),
      text,
      date,
      hour,
      minutes: minutes ?? 0,
      endHour,
      endMinutes: endMinutes ?? 0,
      location,
      createdAt: new Date().toISOString(),
      sourceTaskId,
    }
    saveEvents([...events, newEvent])
    return newEvent.id
  }, [events, saveEvents])

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    const updatedEvents = events.map(event => {
      if (event.id === id) {
        return { ...event, ...updates }
      }
      return event
    })
    saveEvents(updatedEvents)
  }, [events, saveEvents])

  const deleteEvent = useCallback((id: string) => {
    saveEvents(events.filter(event => event.id !== id))
  }, [events, saveEvents])

  const value: StoreContextType = {
    tasks,
    journal,
    events,
    projects,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    clearCompleted,
    saveJournalEntry,
    getJournalEntry,
    getAllJournalEntries,
    addProject,
    updateProject,
    deleteProject,
    saveProjectContent,
    getProject,
    getAllProjects,
    addEvent,
    updateEvent,
    deleteEvent,
  }

  return React.createElement(StoreContext.Provider, { value }, children)
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
