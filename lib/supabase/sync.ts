'use client'

import { supabase } from './client'
import type { Task, Event, JournalEntry, Project } from '@/types'

// Convert database row to app type
export function dbTaskToApp(dbTask: any): Task {
  return {
    id: dbTask.id,
    text: dbTask.text,
    completed: dbTask.completed,
    completedAt: dbTask.completed_at,
    dueDate: dbTask.due_date,
    priority: dbTask.priority,
    scheduledSlots: dbTask.scheduled_slots || [],
    createdAt: dbTask.created_at,
    updatedAt: dbTask.updated_at || dbTask.created_at,
    order: dbTask.order,
    subtasks: dbTask.subtasks,
    recurrence: dbTask.recurrence,
    parentTaskId: dbTask.parent_task_id,
    completedDates: dbTask.completed_dates || [],
  }
}

function appTaskToDb(task: Task): any {
  return {
    id: task.id,
    text: task.text,
    completed: task.completed,
    completed_at: task.completedAt,
    due_date: task.dueDate,
    priority: task.priority,
    scheduled_slots: task.scheduledSlots || [],
    created_at: task.createdAt,
    updated_at: task.updatedAt || task.createdAt || new Date().toISOString(),
    order: task.order,
    subtasks: task.subtasks,
    recurrence: task.recurrence,
    parent_task_id: task.parentTaskId,
    completed_dates: task.completedDates || [],
  }
}

export function dbEventToApp(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    text: dbEvent.text,
    date: dbEvent.date,
    hour: dbEvent.hour,
    minutes: dbEvent.minutes,
    endHour: dbEvent.end_hour,
    endMinutes: dbEvent.end_minutes,
    location: dbEvent.location,
    allDay: dbEvent.all_day,
    createdAt: dbEvent.created_at,
    sourceTaskId: dbEvent.source_task_id,
    recurrence: dbEvent.recurrence,
    parentEventId: dbEvent.parent_event_id,
  }
}

function appEventToDb(event: Event): any {
  return {
    id: event.id,
    text: event.text,
    date: event.date,
    hour: event.hour,
    minutes: event.minutes ?? 0,
    end_hour: event.endHour,
    end_minutes: event.endMinutes ?? 0,
    location: event.location,
    all_day: event.allDay ?? false,
    created_at: event.createdAt,
    source_task_id: event.sourceTaskId,
    recurrence: event.recurrence,
    parent_event_id: event.parentEventId,
  }
}

export function dbJournalToApp(dbJournal: any): JournalEntry {
  return {
    date: dbJournal.date,
    content: dbJournal.content,
    updatedAt: dbJournal.updated_at,
  }
}

function appJournalToDb(journal: JournalEntry, userId: string): any {
  return {
    date: journal.date,
    content: journal.content,
    updated_at: journal.updatedAt,
  }
}

export function dbProjectToApp(dbProject: any): Project {
  return {
    id: dbProject.id,
    name: dbProject.name,
    content: dbProject.content,
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at,
  }
}

function appProjectToDb(project: Project): any {
  return {
    id: project.id,
    name: project.name,
    content: project.content,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  }
}

// Tasks
export async function syncTasksToSupabase(userId: string, tasks: Task[]): Promise<void> {
  const dbTasks = tasks.map(appTaskToDb).map(task => ({ ...task, user_id: userId }))
  
  // Delete all existing tasks for this user
  await supabase.from('tasks').delete().eq('user_id', userId)
  
  // Insert all tasks
  if (dbTasks.length > 0) {
    const { error } = await supabase.from('tasks').insert(dbTasks)
    if (error) throw error
  }
}

export async function fetchTasksFromSupabase(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('order', { ascending: true })
  
  if (error) throw error
  return (data || []).map(dbTaskToApp)
}

export async function upsertTaskToSupabase(userId: string, task: Task): Promise<void> {
  const dbTask = { ...appTaskToDb(task), user_id: userId, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('tasks').upsert(dbTask)
  if (error) throw error
}

export async function deleteTaskFromSupabase(userId: string, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
    .eq('id', taskId)
  if (error) throw error
}

// Events
export async function syncEventsToSupabase(userId: string, events: Event[]): Promise<void> {
  const dbEvents = events.map(appEventToDb).map(event => ({ ...event, user_id: userId }))
  
  await supabase.from('events').delete().eq('user_id', userId)
  
  if (dbEvents.length > 0) {
    const { error } = await supabase.from('events').insert(dbEvents)
    if (error) throw error
  }
}

export async function fetchEventsFromSupabase(userId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
    .order('hour', { ascending: true })
  
  if (error) throw error
  return (data || []).map(dbEventToApp)
}

export async function upsertEventToSupabase(userId: string, event: Event): Promise<void> {
  const dbEvent = { ...appEventToDb(event), user_id: userId, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('events').upsert(dbEvent)
  if (error) throw error
}

export async function deleteEventFromSupabase(userId: string, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('user_id', userId)
    .eq('id', eventId)
  if (error) throw error
}

// Journal
export async function syncJournalToSupabase(userId: string, journal: Record<string, JournalEntry>): Promise<void> {
  const entries = Object.values(journal)
  const dbEntries = entries.map(entry => ({
    ...appJournalToDb(entry, userId),
    user_id: userId,
  }))
  
  if (dbEntries.length > 0) {
    const { error } = await supabase.from('journal_entries').upsert(dbEntries, { onConflict: 'user_id,date' })
    if (error) throw error
  }
}

export async function fetchJournalFromSupabase(userId: string): Promise<Record<string, JournalEntry>> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  
  if (error) throw error
  
  const journal: Record<string, JournalEntry> = {}
  ;(data || []).forEach(entry => {
    journal[entry.date] = dbJournalToApp(entry)
  })
  return journal
}

export async function upsertJournalEntryToSupabase(userId: string, entry: JournalEntry): Promise<void> {
  const dbEntry = {
    ...appJournalToDb(entry, userId),
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('journal_entries').upsert(dbEntry, { onConflict: 'user_id,date' })
  if (error) throw error
}

// Projects
export async function syncProjectsToSupabase(userId: string, projects: Project[]): Promise<void> {
  const dbProjects = projects.map(appProjectToDb).map(project => ({ ...project, user_id: userId }))
  
  await supabase.from('projects').delete().eq('user_id', userId)
  
  if (dbProjects.length > 0) {
    const { error } = await supabase.from('projects').insert(dbProjects)
    if (error) throw error
  }
}

export async function fetchProjectsFromSupabase(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return (data || []).map(dbProjectToApp)
}

export async function upsertProjectToSupabase(userId: string, project: Project): Promise<void> {
  const dbProject = { ...appProjectToDb(project), user_id: userId, updated_at: new Date().toISOString() }
  const { error } = await supabase.from('projects').upsert(dbProject)
  if (error) throw error
}

export async function deleteProjectFromSupabase(userId: string, projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('user_id', userId)
    .eq('id', projectId)
  if (error) throw error
}
