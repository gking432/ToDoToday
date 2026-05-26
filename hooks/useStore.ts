'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import type { Task, JournalEntry, Event, Subtask, Project, RecurrencePattern } from '@/types'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'
import * as sync from '@/lib/supabase/sync'
import { useRealtimeSync } from './useRealtimeSync'

import { TASKS_KEY, JOURNAL_KEY, EVENTS_KEY, PROJECTS_KEY } from '@/lib/storage-keys'

interface StoreContextType {
  tasks: Task[]
  journal: Record<string, JournalEntry>
  events: Event[]
  projects: Project[]
  addTask: (text: string, subtasks?: Subtask[], dueDate?: string, recurrence?: any) => string
  updateTask: (id: string, updates: Partial<Task>, instanceDate?: string) => void
  deleteTask: (id: string, singleInstanceDate?: string) => void
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
  addEvent: (text: string, date: string, hour: number, sourceTaskId?: string, endHour?: number, location?: string, minutes?: number, endMinutes?: number, allDay?: boolean, recurrence?: RecurrencePattern | null) => string
  updateEvent: (id: string, updates: Partial<Event>) => void
  deleteEvent: (id: string, singleInstanceDate?: string) => void
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
  const activeRemoteLoadSeqRef = useRef(0)
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

  // On sign-in, Supabase is the source of truth.
  // We replace local state with the server snapshot rather than merging,
  // because a local-first merge resurrects items deleted on other devices.
  // Individual edits still push to Supabase via the per-operation upserts below,
  // and live cross-device updates come through useRealtimeSync.
  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    const loadSeq = ++activeRemoteLoadSeqRef.current

    const loadFromSupabase = async () => {
      isSyncingRef.current = true
      setIsLoadingFromSupabase(true)

      try {
        const [supabaseTasks, supabaseEvents, supabaseJournal, supabaseProjects] = await Promise.all([
          sync.fetchTasksFromSupabase(userId).catch((err) => {
            console.error('fetchTasksFromSupabase:', err)
            return [] as Task[]
          }),
          sync.fetchEventsFromSupabase(userId).catch((err) => {
            console.error('fetchEventsFromSupabase:', err)
            return [] as Event[]
          }),
          sync.fetchJournalFromSupabase(userId).catch((err) => {
            console.error('fetchJournalFromSupabase:', err)
            return {}
          }),
          sync.fetchProjectsFromSupabase(userId).catch((err) => {
            console.error('fetchProjectsFromSupabase:', err)
            return [] as Project[]
          }),
        ])

        if (activeRemoteLoadSeqRef.current !== loadSeq) return

        setTasks(supabaseTasks)
        setEvents(supabaseEvents)
        setJournal(supabaseJournal)
        setProjects(supabaseProjects)

        if (typeof window !== 'undefined') {
          localStorage.setItem(TASKS_KEY, JSON.stringify(supabaseTasks))
          localStorage.setItem(EVENTS_KEY, JSON.stringify(supabaseEvents))
          localStorage.setItem(JOURNAL_KEY, JSON.stringify(supabaseJournal))
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(supabaseProjects))
        }
      } catch (error) {
        console.error('Error loading from Supabase:', error)
      } finally {
        if (activeRemoteLoadSeqRef.current === loadSeq) {
          setIsLoadingFromSupabase(false)
          isSyncingRef.current = false
        }
      }
    }

    loadFromSupabase()

    return () => {
      activeRemoteLoadSeqRef.current++
    }
  }, [user?.id])

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
        const existingTime = new Date(existing.updatedAt || existing.createdAt).getTime()
        const remoteTime = new Date(event.updatedAt || event.createdAt).getTime()
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

  // One-time recovery helper: overwrite Supabase with this device's local data.
  // Call from the browser console on the device that has the correct data:
  //   await window.__todoForcePushFromThisDevice()
  // Then sign out and back in on the other devices to pull the fresh state.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const userId = user?.id
    if (!userId) {
      delete (window as any).__todoForcePushFromThisDevice
      return
    }
    ;(window as any).__todoForcePushFromThisDevice = async () => {
      const { supabase } = await import('@/lib/supabase/client')
      console.log('[force-push] wiping remote rows for user', userId)
      await Promise.all([
        supabase.from('tasks').delete().eq('user_id', userId),
        supabase.from('events').delete().eq('user_id', userId),
        supabase.from('journal_entries').delete().eq('user_id', userId),
        supabase.from('projects').delete().eq('user_id', userId),
      ])
      const localTasks = getStoredTasks()
      const localEvents = getStoredEvents()
      const localJournal = getStoredJournal()
      const localProjects = getStoredProjects()
      console.log('[force-push] uploading local', {
        tasks: localTasks.length,
        events: localEvents.length,
        journalEntries: Object.keys(localJournal).length,
        projects: localProjects.length,
      })
      await Promise.all([
        localTasks.length ? sync.syncTasksToSupabase(userId, localTasks) : Promise.resolve(),
        localEvents.length ? sync.syncEventsToSupabase(userId, localEvents) : Promise.resolve(),
        Object.keys(localJournal).length ? sync.syncJournalToSupabase(userId, localJournal) : Promise.resolve(),
        localProjects.length ? sync.syncProjectsToSupabase(userId, localProjects) : Promise.resolve(),
      ])
      console.log('[force-push] done. Sign out and back in on other devices.')
      return 'Force-push complete.'
    }
    return () => {
      delete (window as any).__todoForcePushFromThisDevice
    }
  }, [user?.id])

  // Save tasks to localStorage (Supabase sync handled by individual operations)
  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks))
    }
    
    return newTasks
  }, [])

  // Save journal to localStorage (Supabase sync handled by individual operations)
  const saveJournal = useCallback((newJournal: Record<string, JournalEntry>) => {
    setJournal(newJournal)
    if (typeof window !== 'undefined') {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(newJournal))
    }
  }, [])

  // Save events to localStorage (Supabase sync handled by individual operations)
  const saveEvents = useCallback((newEvents: Event[]) => {
    setEvents(newEvents)
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(newEvents))
    }
  }, [])

  // Save projects to localStorage (Supabase sync handled by individual operations)
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
      updatedAt: new Date().toISOString(),
      order: tasks.length,
      subtasks: subtasks && subtasks.length > 0 ? subtasks.filter(s => s.text.trim()) : undefined,
      recurrence: recurrence || null,
      parentTaskId: null,
    }
    saveTasks([...tasks, newTask])
    
    // Sync new task to Supabase
    if (user && !isSyncingRef.current) {
      sync.upsertTaskToSupabase(user.id, newTask).catch(console.error)
    }
    return newTask.id
  }, [tasks, saveTasks, user])

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

  const deleteTask = useCallback(
    (id: string, singleInstanceDate?: string) => {
      const task = tasks.find((t) => t.id === id)
      if (task?.recurrence && singleInstanceDate) {
        const excluded = [...new Set([...(task.excludedDates ?? []), singleInstanceDate])]
        const updatedTasks = tasks.map((t) =>
          t.id === id
            ? { ...t, excludedDates: excluded, updatedAt: new Date().toISOString() }
            : t
        )
        saveTasks(updatedTasks)
        const updatedTask = updatedTasks.find((t) => t.id === id)
        if (user && updatedTask && !isSyncingRef.current) {
          sync.upsertTaskToSupabase(user.id, updatedTask).catch(console.error)
        }
        return
      }

      saveTasks(tasks.filter((task) => task.id !== id))

      if (user && !isSyncingRef.current) {
        sync.deleteTaskFromSupabase(user.id, id).catch(console.error)
      }
    },
    [tasks, saveTasks, user]
  )

  const reorderTasks = useCallback((newOrder: Task[]) => {
    const reordered = newOrder.map((task, index) => ({ ...task, order: index, updatedAt: new Date().toISOString() }))
    saveTasks(reordered)
    
    // Sync reordered tasks to Supabase individually
    if (user && !isSyncingRef.current) {
      Promise.all(
        reordered.map(task => sync.upsertTaskToSupabase(user.id, task))
      ).catch(console.error)
    }
  }, [saveTasks, user])

  const clearCompleted = useCallback(() => {
    const completedIds = tasks.filter(task => task.completed).map(t => t.id)
    saveTasks(tasks.filter(task => !task.completed))
    
    // Delete completed tasks from Supabase
    if (user && !isSyncingRef.current) {
      Promise.all(
        completedIds.map(id => sync.deleteTaskFromSupabase(user.id, id))
      ).catch(console.error)
    }
  }, [tasks, saveTasks, user])

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
    
    // Sync new project to Supabase
    if (user && !isSyncingRef.current) {
      sync.upsertProjectToSupabase(user.id, newProject).catch(console.error)
    }
    return newProject.id
  }, [projects, saveProjects, user])

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
    
    // Sync individual project update to Supabase
    const updatedProject = updatedProjects.find(p => p.id === id)
    if (user && updatedProject && !isSyncingRef.current) {
      sync.upsertProjectToSupabase(user.id, updatedProject).catch(console.error)
    }
  }, [projects, saveProjects, user])

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
    endMinutes?: number,
    allDay?: boolean,
    recurrence?: RecurrencePattern | null
  ): string => {
    const newEvent: Event = {
      id: crypto.randomUUID(),
      text,
      date,
      hour: allDay ? 0 : hour,
      minutes: allDay ? 0 : (minutes ?? 0),
      endHour: allDay ? undefined : endHour,
      endMinutes: allDay ? 0 : (endMinutes ?? 0),
      location,
      allDay: allDay || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceTaskId,
      recurrence: recurrence ?? null,
    }
    saveEvents([...events, newEvent])
    
    // Sync new event to Supabase
    if (user && !isSyncingRef.current) {
      sync.upsertEventToSupabase(user.id, newEvent).catch(console.error)
    }
    return newEvent.id
  }, [events, saveEvents, user])

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    const updatedEvents = events.map(event => {
      if (event.id === id) {
        return { ...event, ...updates, updatedAt: new Date().toISOString() }
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

  const deleteEvent = useCallback(
    (id: string, singleInstanceDate?: string) => {
      const event = events.find((e) => e.id === id)
      if (event?.recurrence && singleInstanceDate) {
        const excluded = [...new Set([...(event.excludedDates ?? []), singleInstanceDate])]
        const updatedEvents = events.map((e) =>
          e.id === id
            ? { ...e, excludedDates: excluded, updatedAt: new Date().toISOString() }
            : e
        )
        saveEvents(updatedEvents)
        const updatedEvent = updatedEvents.find((e) => e.id === id)
        if (user && updatedEvent && !isSyncingRef.current) {
          sync.upsertEventToSupabase(user.id, updatedEvent).catch(console.error)
        }
        return
      }

      saveEvents(events.filter((ev) => ev.id !== id))

      if (user && !isSyncingRef.current) {
        sync.deleteEventFromSupabase(user.id, id).catch(console.error)
      }
    },
    [events, saveEvents, user]
  )

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
