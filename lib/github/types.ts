import type { Task, Event, JournalEntry, Project } from '@/types'

export interface SyncBundle {
  version: 1
  updatedAt: string
  tasks: Task[]
  events: Event[]
  journal: Record<string, JournalEntry>
  projects: Project[]
}

export function createSyncBundle(data: {
  tasks: Task[]
  events: Event[]
  journal: Record<string, JournalEntry>
  projects: Project[]
}): SyncBundle {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks: data.tasks,
    events: data.events,
    journal: data.journal,
    projects: data.projects,
  }
}
