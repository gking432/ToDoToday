'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Task, Event, JournalEntry, Project } from '@/types'
import { dbTaskToApp, dbEventToApp, dbJournalToApp, dbProjectToApp } from '@/lib/supabase/sync'

interface UseRealtimeSyncOptions {
  userId: string | null
  onTaskChange: (task: Task) => void
  onTaskDelete: (taskId: string) => void
  onEventChange: (event: Event) => void
  onEventDelete: (eventId: string) => void
  onJournalChange: (entry: JournalEntry) => void
  onProjectChange: (project: Project) => void
  onProjectDelete: (projectId: string) => void
}

export function useRealtimeSync({
  userId,
  onTaskChange,
  onTaskDelete,
  onEventChange,
  onEventDelete,
  onJournalChange,
  onProjectChange,
  onProjectDelete,
}: UseRealtimeSyncOptions) {
  const subscriptionsRef = useRef<Array<{ unsubscribe: () => void }>>([])

  useEffect(() => {
    if (!userId) return

    // Subscribe to tasks changes
    const tasksSubscription = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            onTaskDelete(payload.old.id)
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const task = dbTaskToApp(payload.new as any)
            onTaskChange(task)
          }
        }
      )
      .subscribe()

    // Subscribe to events changes
    const eventsSubscription = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            onEventDelete(payload.old.id)
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const event = dbEventToApp(payload.new as any)
            onEventChange(event)
          }
        }
      )
      .subscribe()

    // Subscribe to journal entries changes
    const journalSubscription = supabase
      .channel('journal-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journal_entries',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const entry = dbJournalToApp(payload.new as any)
            onJournalChange(entry)
          }
        }
      )
      .subscribe()

    // Subscribe to projects changes
    const projectsSubscription = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            onProjectDelete(payload.old.id)
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const project = dbProjectToApp(payload.new as any)
            onProjectChange(project)
          }
        }
      )
      .subscribe()

    subscriptionsRef.current = [
      { unsubscribe: () => tasksSubscription.unsubscribe() },
      { unsubscribe: () => eventsSubscription.unsubscribe() },
      { unsubscribe: () => journalSubscription.unsubscribe() },
      { unsubscribe: () => projectsSubscription.unsubscribe() },
    ]

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe())
      subscriptionsRef.current = []
    }
  }, [userId, onTaskChange, onTaskDelete, onEventChange, onEventDelete, onJournalChange, onProjectChange, onProjectDelete])
}
