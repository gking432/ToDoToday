'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import type { Task, JournalEntry, Event, Subtask, Project } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'
import * as sync from '@/lib/supabase/sync'
import { useRealtimeSync } from './useRealtimeSync'

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
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [journal, setJournal] = useState<Record<string, JournalEntry>>({})
  const [events, setEvents] = useState<Event[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoadingFromSupabase, setIsLoadingFromSupabase] = useState(false)
  const isInitialLoadRef = useRef(true)
  const isSyncingRef = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    const storedTasks = getStoredTasks()
    // Add backward compatibility: ensure all tasks have completedAt field
    const normalizedTasks = storedTasks.map(task => ({
      ...task,
      completedAt: task.completedAt || (task.completed ? task.createdAt : null),
      updatedAt: task.updatedAt || task.createdAt,
    }))
    // Save normalized tasks back to localStorage if any were updated
    if (normalizedTasks.some((task, i) => task.completedAt !== storedTasks[i]?.completedAt || task.updatedAt !== storedTasks[i]?.updatedAt)) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(TASKS_KEY, JSON.stringify(normalizedTasks))
      }
    }
    setTasks(normalizedTasks)
    setJournal(getStoredJournal())
    setEvents(getStoredEvents())
    setProjects(getStoredProjects())
  }, [])

  // Load from Supabase when user is authenticated
  useEffect(() => {
    if (!user || !isInitialLoadRef.current) return
    isInitialLoadRef.current = false
    
    const loadFromSupabase = async () => {
      if (isSyncingRef.current) return
      isSyncingRef.current = true
      setIsLoadingFromSupabase(true)
      
      try {
        const userId = user.id
        
        // Fetch all data from Supabase
        const [supabaseTasks, supabaseEvents, supabaseJournal, supabaseProjects] = await Promise.all([
          sync.fetchTasksFromSupabase(userId).catch(() => []),
          sync.fetchEventsFromSupabase(userId).catch(() => []),
          sync.fetchJournalFromSupabase(userId).catch(() => ({})),
          sync.fetchProjectsFromSupabase(userId).catch(() => []),
        ])
        
        // Merge with localStorage data (local takes precedence if timestamps are equal)
        const localTasks = getStoredTasks()
        const localEvents = getStoredEvents()
        const localJournal = getStoredJournal()
        const localProjects = getStoredProjects()
        
        // Merge tasks: use most recent updatedAt
        const mergedTasks = mergeByTimestamp(localTasks, supabaseTasks, 'updatedAt')
        const mergedEvents = mergeByTimestamp(localEvents, supabaseEvents, 'createdAt')
        const mergedJournal = mergeJournalEntries(localJournal, supabaseJournal)
        const mergedProjects = mergeByTimestamp(localProjects, supabaseProjects, 'updatedAt')
        
        // Update state
        setTasks(mergedTasks)
        setEvents(mergedEvents)
        setJournal(mergedJournal)
        setProjects(mergedProjects)
        
        // Save merged data to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(TASKS_KEY, JSON.stringify(mergedTasks))
          localStorage.setItem(EVENTS_KEY, JSON.stringify(mergedEvents))
          localStorage.setItem(JOURNAL_KEY, JSON.stringify(mergedJournal))
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(mergedProjects))
        }
        
        // Sync merged data back to Supabase
        await Promise.all([
          sync.syncTasksToSupabase(userId, mergedTasks).catch(console.error),
          sync.syncEventsToSupabase(userId, mergedEvents).catch(console.error),
          sync.syncJournalToSupabase(userId, mergedJournal).catch(console.error),
          sync.syncProjectsToSupabase(userId, mergedProjects).catch(console.error),
        ])
      } catch (error) {
        console.error('Error loading from Supabase:', error)
      } finally {
        setIsLoadingFromSupabase(false)
        isSyncingRef.current = false
      }
    }
    
    loadFromSupabase()
  }, [user])

  // Real-time sync handlers
  const handleTaskChange = useCallback((task: Task) => {
    setTasks((currentTasks) => {
      const existingIndex = currentTasks.findIndex((t) => t.id === task.id)
      if (existingIndex >= 0) {
        // Update existing task only if remote is newer
        const existing = currentTasks[existingIndex]
        const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime()
        const remoteTime = new Date(task.updatedAt || task.createdAt).getTime()
        if (remoteTime > existingTime) {
          const updated = [...currentTasks]
          updated[existingIndex] = task
          if (typeof window !== 'undefined') {
            localStorage.setItem(TASKS_KEY, JSON.stringify(updated))
          }
          return updated
        }
        return currentTasks
      } else {
        // Add new task
        const updated = [...currentTasks, task]
        if (typeof window !== 'undefined') {
          localStorage.setItem(TASKS_KEY, JSON.stringify(updated))
        }
        return updated
      }
    })
  }, [])

  const handleTaskDelete = useCallback((taskId: string) => {
    setTasks((currentTasks) => {
      const updated = currentTasks.filter((t) => t.id !== taskId)
      if (typeof window !== 'undefined') {
        localStorage.setItem(TASKS_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const handleEventChange = useCallback((event: Event) => {
    setEvents((currentEvents) => {
      const existingIndex = currentEvents.findIndex((e) => e.id === event.id)
      if (existingIndex >= 0) {
        // Update existing event only if remote is newer
        const existing = currentEvents[existingIndex]
        const existingTime = new Date(existing.createdAt).getTime()
        const remoteTime = new Date(event.createdAt).getTime()
        if (remoteTime > existingTime) {
          const updated = [...currentEvents]
          updated[existingIndex] = event
          if (typeof window !== 'undefined') {
            localStorage.setItem(EVENTS_KEY, JSON.stringify(updated))
          }
          return updated
        }
        return currentEvents
      } else {
        // Add new event
        const updated = [...currentEvents, event]
        if (typeof window !== 'undefined') {
          localStorage.setItem(EVENTS_KEY, JSON.stringify(updated))
        }
        return updated
      }
    })
  }, [])

  const handleEventDelete = useCallback((eventId: string) => {
    setEvents((currentEvents) => {
      const updated = currentEvents.filter((e) => e.id !== eventId)
      if (typeof window !== 'undefined') {
        localStorage.setItem(EVENTS_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const handleJournalChange = useCallback((entry: JournalEntry) => {
    setJournal((currentJournal) => {
      const existing = currentJournal[entry.date]
      if (existing) {
        // Update only if remote is newer
        const existingTime = new Date(existing.updatedAt).getTime()
        const remoteTime = new Date(entry.updatedAt).getTime()
        if (remoteTime > existingTime) {
          const updated = { ...currentJournal, [entry.date]: entry }
          if (typeof window !== 'undefined') {
            localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated))
          }
          return updated
        }
        return currentJournal
      } else {
        // Add new entry
        const updated = { ...currentJournal, [entry.date]: entry }
        if (typeof window !== 'undefined') {
          localStorage.setItem(JOURNAL_KEY, JSON.stringify(updated))
        }
        return updated
      }
    })
  }, [])

  const handleProjectChange = useCallback((project: Project) => {
    setProjects((currentProjects) => {
      const existingIndex = currentProjects.findIndex((p) => p.id === project.id)
      if (existingIndex >= 0) {
        // Update existing project only if remote is newer
        const existing = currentProjects[existingIndex]
        const existingTime = new Date(existing.updatedAt).getTime()
        const remoteTime = new Date(project.updatedAt).getTime()
        if (remoteTime > existingTime) {
          const updated = [...currentProjects]
          updated[existingIndex] = project
          if (typeof window !== 'undefined') {
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
          }
          return updated
        }
        return currentProjects
      } else {
        // Add new project
        const updated = [...currentProjects, project]
        if (typeof window !== 'undefined') {
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
        }
        return updated
      }
    })
  }, [])

  const handleProjectDelete = useCallback((projectId: string) => {
    setProjects((currentProjects) => {
      const updated = currentProjects.filter((p) => p.id !== projectId)
      if (typeof window !== 'undefined') {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  // Set up real-time sync
  useRealtimeSync({
    userId: user?.id || null,
    onTaskChange: handleTaskChange,
    onTaskDelete: handleTaskDelete,
    onEventChange: handleEventChange,
    onEventDelete: handleEventDelete,
    onJournalChange: handleJournalChange,
    onProjectChange: handleProjectChange,
    onProjectDelete: handleProjectDelete,
  })

  // Helper function to merge arrays by timestamp
  const mergeByTimestamp = <T extends { id: string; updatedAt?: string; createdAt: string }>(
    local: T[],
    remote: T[],
    timestampField: 'updatedAt' | 'createdAt'
  ): T[] => {
    const merged = new Map<string, T>()
    
    // Add all local items
    local.forEach(item => {
      merged.set(item.id, item)
    })
    
    // Merge remote items (keep most recent)
    remote.forEach(remoteItem => {
      const localItem = merged.get(remoteItem.id)
      if (!localItem) {
        merged.set(remoteItem.id, remoteItem)
      } else {
        const localTime = new Date(localItem[timestampField] || localItem.createdAt).getTime()
        const remoteTime = new Date(remoteItem[timestampField] || remoteItem.createdAt).getTime()
        if (remoteTime > localTime) {
          merged.set(remoteItem.id, remoteItem)
        }
      }
    })
    
    return Array.from(merged.values())
  }

  // Helper function to merge journal entries
  const mergeJournalEntries = (
    local: Record<string, JournalEntry>,
    remote: Record<string, JournalEntry>
  ): Record<string, JournalEntry> => {
    const merged = { ...local }
    
    Object.entries(remote).forEach(([date, remoteEntry]) => {
      const localEntry = merged[date]
      if (!localEntry) {
        merged[date] = remoteEntry
      } else {
        const localTime = new Date(localEntry.updatedAt).getTime()
        const remoteTime = new Date(remoteEntry.updatedAt).getTime()
        if (remoteTime > localTime) {
          merged[date] = remoteEntry
        }
      }
    })
    
    return merged
  }

  // Save tasks to localStorage and sync to Supabase
  const saveTasks = useCallback((newTasks: Task[]) => {
    // Add updatedAt to all tasks
    const tasksWithTimestamp = newTasks.map(task => ({
      ...task,
      updatedAt: new Date().toISOString(),
    }))
    
    setTasks(tasksWithTimestamp)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasksWithTimestamp))
    }
    
    // Sync to Supabase in background (fire and forget)
    if (user && !isSyncingRef.current) {
      sync.syncTasksToSupabase(user.id, tasksWithTimestamp).catch(console.error)
    }
  }, [user])

  // Save journal to localStorage and sync to Supabase
  const saveJournal = useCallback((newJournal: Record<string, JournalEntry>) => {
    setJournal(newJournal)
    if (typeof window !== 'undefined') {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(newJournal))
    }
    
    // Sync to Supabase in background
    if (user && !isSyncingRef.current) {
      sync.syncJournalToSupabase(user.id, newJournal).catch(console.error)
    }
  }, [user])

  // Save events to localStorage and sync to Supabase
  const saveEvents = useCallback((newEvents: Event[]) => {
    setEvents(newEvents)
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(newEvents))
    }
    
    // Sync to Supabase in background
    if (user && !isSyncingRef.current) {
      sync.syncEventsToSupabase(user.id, newEvents).catch(console.error)
    }
  }, [user])

  // Save projects to localStorage and sync to Supabase
  const saveProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects))
    }
    
    // Sync to Supabase in background
    if (user && !isSyncingRef.current) {
      sync.syncProjectsToSupabase(user.id, newProjects).catch(console.error)
    }
  }, [user])

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
        const updated = { ...task, ...updates, updatedAt: new Date().toISOString() }
        
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
    
    // Also sync individual task update to Supabase
    const updatedTask = updatedTasks.find(t => t.id === id)
    if (user && updatedTask && !isSyncingRef.current) {
      sync.upsertTaskToSupabase(user.id, updatedTask).catch(console.error)
    }
  }, [tasks, saveTasks, user])

  const deleteTask = useCallback((id: string) => {
    saveTasks(tasks.filter(task => task.id !== id))
    
    // Also delete from Supabase
    if (user && !isSyncingRef.current) {
      sync.deleteTaskFromSupabase(user.id, id).catch(console.error)
    }
  }, [tasks, saveTasks, user])

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
    
    // Also sync individual journal entry to Supabase
    if (user && !isSyncingRef.current) {
      sync.upsertJournalEntryToSupabase(user.id, newJournal[date]).catch(console.error)
    }
  }, [journal, saveJournal, user])

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
    
    // Also sync individual project update to Supabase
    const updatedProject = updatedProjects.find(p => p.id === id)
    if (user && updatedProject && !isSyncingRef.current) {
      sync.upsertProjectToSupabase(user.id, updatedProject).catch(console.error)
    }
  }, [projects, saveProjects, user])

  const deleteProject = useCallback((id: string) => {
    saveProjects(projects.filter(project => project.id !== id))
    
    // Also delete from Supabase
    if (user && !isSyncingRef.current) {
      sync.deleteProjectFromSupabase(user.id, id).catch(console.error)
    }
  }, [projects, saveProjects, user])

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
    
    // Also sync individual event update to Supabase
    const updatedEvent = updatedEvents.find(e => e.id === id)
    if (user && updatedEvent && !isSyncingRef.current) {
      sync.upsertEventToSupabase(user.id, updatedEvent).catch(console.error)
    }
  }, [events, saveEvents, user])

  const deleteEvent = useCallback((id: string) => {
    saveEvents(events.filter(event => event.id !== id))
    
    // Also delete from Supabase
    if (user && !isSyncingRef.current) {
      sync.deleteEventFromSupabase(user.id, id).catch(console.error)
    }
  }, [events, saveEvents, user])

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
