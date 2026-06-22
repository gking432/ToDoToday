'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import type { Task, JournalEntry, Event, Subtask, Project, RecurrencePattern } from '@/types'

import { TASKS_KEY, JOURNAL_KEY, EVENTS_KEY, PROJECTS_KEY, LOCAL_SYNC_UPDATED_AT_KEY } from '@/lib/storage-keys'
import type { SyncBundle } from '@/lib/github/types'

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
  applySyncBundle: (bundle: SyncBundle) => void
  getSyncSnapshot: () => Pick<SyncBundle, 'tasks' | 'events' | 'journal' | 'projects'>
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
  const tasksRef = useRef(tasks)
  const journalRef = useRef(journal)
  const eventsRef = useRef(events)
  const projectsRef = useRef(projects)
  const skipSyncTouchRef = useRef(false)

  tasksRef.current = tasks
  journalRef.current = journal
  eventsRef.current = events
  projectsRef.current = projects

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

  const touchLocalSync = useCallback(() => {
    if (skipSyncTouchRef.current || typeof window === 'undefined') return
    localStorage.setItem(LOCAL_SYNC_UPDATED_AT_KEY, new Date().toISOString())
  }, [])

  const applySyncBundle = useCallback((bundle: SyncBundle) => {
    skipSyncTouchRef.current = true
    setTasks(bundle.tasks)
    setEvents(bundle.events)
    setJournal(bundle.journal)
    setProjects(bundle.projects)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(bundle.tasks))
      localStorage.setItem(EVENTS_KEY, JSON.stringify(bundle.events))
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(bundle.journal))
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(bundle.projects))
      localStorage.setItem(LOCAL_SYNC_UPDATED_AT_KEY, bundle.updatedAt)
    }
    skipSyncTouchRef.current = false
  }, [])

  const getSyncSnapshot = useCallback(() => ({
    tasks: tasksRef.current,
    events: eventsRef.current,
    journal: journalRef.current,
    projects: projectsRef.current,
  }), [])

  // Local backup helpers (browser console)
  useEffect(() => {
    if (typeof window === 'undefined') return

    ;(window as any).__todoEmergencySnapshot = () => {
      const fromStorage = {
        tasks: getStoredTasks(),
        events: getStoredEvents(),
        journal: getStoredJournal(),
        projects: getStoredProjects(),
      }
      const fromMemory = {
        tasks: tasksRef.current,
        events: eventsRef.current,
        journal: journalRef.current,
        projects: projectsRef.current,
      }
      const pick = (storageLen: number, memoryLen: number, storage: unknown, memory: unknown) =>
        storageLen >= memoryLen ? storage : memory
      const backup = {
        tasks: pick(
          fromStorage.tasks.length,
          fromMemory.tasks.length,
          fromStorage.tasks,
          fromMemory.tasks
        ) as Task[],
        events: pick(
          fromStorage.events.length,
          fromMemory.events.length,
          fromStorage.events,
          fromMemory.events
        ) as Event[],
        journal: pick(
          Object.keys(fromStorage.journal).length,
          Object.keys(fromMemory.journal).length,
          fromStorage.journal,
          fromMemory.journal
        ) as Record<string, JournalEntry>,
        projects: pick(
          fromStorage.projects.length,
          fromMemory.projects.length,
          fromStorage.projects,
          fromMemory.projects
        ) as Project[],
      }
      console.log('[recovery] snapshot counts', {
        tasks: backup.tasks.length,
        events: backup.events.length,
        journalEntries: Object.keys(backup.journal).length,
        projects: backup.projects.length,
      })
      return backup
    }

    ;(window as any).__todoEmergencySaveBackup = async () => {
      const backup = (window as any).__todoEmergencySnapshot()
      const json = JSON.stringify(backup)
      try {
        await navigator.clipboard.writeText(json)
        console.log('[recovery] Copied backup to clipboard.')
      } catch {
        console.log('[recovery] Copy failed — save this JSON manually:', json)
      }
      return backup
    }

    ;(window as any).__todoRestoreBackup = (backup: {
      tasks?: Task[]
      events?: Event[]
      journal?: Record<string, JournalEntry>
      projects?: Project[]
    }) => {
      const data = {
        tasks: backup.tasks ?? [],
        events: backup.events ?? [],
        journal: backup.journal ?? {},
        projects: backup.projects ?? [],
      }
      setTasks(data.tasks)
      setEvents(data.events)
      setJournal(data.journal)
      setProjects(data.projects)
      localStorage.setItem(TASKS_KEY, JSON.stringify(data.tasks))
      localStorage.setItem(EVENTS_KEY, JSON.stringify(data.events))
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(data.journal))
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(data.projects))
      console.log('[recovery] Restored from backup.')
      return 'Restore complete.'
    }

    return () => {
      delete (window as any).__todoEmergencySnapshot
      delete (window as any).__todoEmergencySaveBackup
      delete (window as any).__todoRestoreBackup
    }
  }, [])

  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks))
    }
    touchLocalSync()
    return newTasks
  }, [touchLocalSync])

  const saveJournal = useCallback((newJournal: Record<string, JournalEntry>) => {
    setJournal(newJournal)
    if (typeof window !== 'undefined') {
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(newJournal))
    }
    touchLocalSync()
  }, [touchLocalSync])

  const saveEvents = useCallback((newEvents: Event[]) => {
    setEvents(newEvents)
    if (typeof window !== 'undefined') {
      localStorage.setItem(EVENTS_KEY, JSON.stringify(newEvents))
    }
    touchLocalSync()
  }, [touchLocalSync])

  const saveProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects)
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects))
    }
    touchLocalSync()
  }, [touchLocalSync])

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
  }, [tasks, saveTasks])

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
        return
      }

      saveTasks(tasks.filter((task) => task.id !== id))
    },
    [tasks, saveTasks]
  )

  const reorderTasks = useCallback((newOrder: Task[]) => {
    const reordered = newOrder.map((task, index) => ({ ...task, order: index, updatedAt: new Date().toISOString() }))
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
    return newEvent.id
  }, [events, saveEvents])

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    const updatedEvents = events.map(event => {
      if (event.id === id) {
        return { ...event, ...updates, updatedAt: new Date().toISOString() }
      }
      return event
    })
    saveEvents(updatedEvents)
  }, [events, saveEvents])

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
        return
      }

      saveEvents(events.filter((ev) => ev.id !== id))
    },
    [events, saveEvents]
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
    applySyncBundle,
    getSyncSnapshot,
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
