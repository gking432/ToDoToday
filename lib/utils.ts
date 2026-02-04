import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { RecurrencePattern } from '@/types'
import { addDays, addWeeks, addMonths, getDay, isBefore, isAfter, isSameDay, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  // Use local date to avoid timezone issues
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null
  // Parse date string (YYYY-MM-DD) using local date components to avoid timezone issues
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  // Parse date string (YYYY-MM-DD) using local date components to avoid timezone issues
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

export function wasCompletedToday(completedAt: string | null): boolean {
  if (!completedAt) return false
  const completed = new Date(completedAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  completed.setHours(0, 0, 0, 0)
  return completed.getTime() === today.getTime()
}

export function wasCompletedOnDate(completedAt: string | null, date: Date): boolean {
  if (!completedAt) return false
  const completed = new Date(completedAt)
  const targetDate = new Date(date)
  targetDate.setHours(0, 0, 0, 0)
  completed.setHours(0, 0, 0, 0)
  return completed.getTime() === targetDate.getTime()
}

export function isEventEnded(event: { date: string; hour: number; minutes?: number; endHour?: number; endMinutes?: number }): boolean {
  const now = new Date()
  const todayStr = formatDate(now)
  const eventDate = event.date
  
  // If event date is in the past, it's ended
  if (eventDate < todayStr) return true
  
  // If event date is in the future, it's not ended
  if (eventDate > todayStr) return false
  
  // Event is today - check if end time has passed
  const endHour = event.endHour ?? event.hour + 1
  const endMinutes = event.endMinutes ?? 0
  
  const eventEndTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinutes)
  
  return now >= eventEndTime
}

import { WHIMSICAL_PROMPTS } from '@/types'

export function getWhimsicalPrompt(date: Date): string {
  // Use a hash of the full date string (YYYY-MM-DD) to get better distribution
  // This ensures each date gets a consistent prompt, but with better variety
  const dateStr = formatDate(date)
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  // Use absolute value and modulo to get index
  const index = Math.abs(hash) % WHIMSICAL_PROMPTS.length
  return WHIMSICAL_PROMPTS[index]
}

/**
 * Generate all recurring dates for a given recurrence pattern within a date range
 */
export function generateRecurringDates(
  startDate: string, // ISO date string (YYYY-MM-DD)
  pattern: RecurrencePattern,
  endDate: string // ISO date string - generate instances up to this date
): string[] {
  const dates: string[] = []
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  let current = new Date(start)
  let occurrenceCount = 0

  // Check if we've hit the end date limit
  const hasEndDate = pattern.endDate !== null && pattern.endDate !== undefined
  const endDateLimit = hasEndDate ? parseISO(pattern.endDate!) : null

  while (isBefore(current, end) || isSameDay(current, end)) {
    // Check end conditions
    if (hasEndDate && endDateLimit && isAfter(current, endDateLimit)) {
      break
    }
    if (pattern.endAfter !== null && pattern.endAfter !== undefined && occurrenceCount >= pattern.endAfter) {
      break
    }

    const dateStr = formatDate(current)
    
    // Check if this date matches the pattern
    if (pattern.frequency === 'daily') {
      // Daily: every N days
      const daysSinceStart = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceStart % pattern.interval === 0) {
        dates.push(dateStr)
        occurrenceCount++
      }
      current = addDays(current, 1)
    } else if (pattern.frequency === 'weekly') {
      // Weekly: on specific days of week, every N weeks
      const dayOfWeek = getDay(current) // 0 = Sunday, 6 = Saturday
      if (pattern.daysOfWeek && pattern.daysOfWeek.includes(dayOfWeek)) {
        const weeksSinceStart = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
        if (weeksSinceStart % pattern.interval === 0) {
          dates.push(dateStr)
          occurrenceCount++
        }
      }
      current = addDays(current, 1)
    } else if (pattern.frequency === 'monthly') {
      // Monthly: same day of month, every N months
      if (current.getDate() === start.getDate()) {
        const monthsSinceStart = 
          (current.getFullYear() - start.getFullYear()) * 12 + 
          (current.getMonth() - start.getMonth())
        if (monthsSinceStart % pattern.interval === 0) {
          dates.push(dateStr)
          occurrenceCount++
        }
      }
      current = addDays(current, 1)
    }
  }

  return dates
}

/**
 * Check if a specific date matches a recurrence pattern
 */
export function matchesRecurrence(
  date: string, // ISO date string (YYYY-MM-DD)
  startDate: string, // ISO date string - when recurrence started
  pattern: RecurrencePattern
): boolean {
  const checkDate = parseISO(date)
  const start = parseISO(startDate)

  // Check end conditions
  if (pattern.endDate) {
    const endDate = parseISO(pattern.endDate)
    if (isAfter(checkDate, endDate)) return false
  }

  if (pattern.frequency === 'daily') {
    const daysSinceStart = Math.floor((checkDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceStart >= 0 && daysSinceStart % pattern.interval === 0
  } else if (pattern.frequency === 'weekly') {
    const dayOfWeek = getDay(checkDate)
    if (!pattern.daysOfWeek || !pattern.daysOfWeek.includes(dayOfWeek)) return false
    const weeksSinceStart = Math.floor((checkDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
    return weeksSinceStart >= 0 && weeksSinceStart % pattern.interval === 0
  } else if (pattern.frequency === 'monthly') {
    if (checkDate.getDate() !== start.getDate()) return false
    const monthsSinceStart = 
      (checkDate.getFullYear() - start.getFullYear()) * 12 + 
      (checkDate.getMonth() - start.getMonth())
    return monthsSinceStart >= 0 && monthsSinceStart % pattern.interval === 0
  }

  return false
}

/**
 * Get all tasks that should appear on a given date (including recurring tasks)
 */
export function getTasksForDate<T extends { dueDate: string | null; recurrence?: any; parentTaskId?: string | null; id: string; completed?: boolean; completedDates?: string[] }>(
  tasks: T[],
  date: Date
): T[] {
  const dateStr = formatDate(date)
  const result: T[] = []

  for (const task of tasks) {
    // Skip if this is a recurring instance (we'll handle the parent)
    if (task.parentTaskId) continue

    // Direct match
    if (task.dueDate === dateStr) {
      result.push(task)
      continue
    }

    // Check recurrence
    if (task.recurrence && task.dueDate) {
      if (matchesRecurrence(dateStr, task.dueDate, task.recurrence)) {
        // For recurring tasks, check if this specific date instance is completed
        const isInstanceCompleted = task.completedDates?.includes(dateStr) || false
        // Create a virtual instance for this date
        result.push({
          ...task,
          dueDate: dateStr, // Override with the instance date
          parentTaskId: task.id, // Mark as instance
          completed: isInstanceCompleted, // Set completion status for this instance
        } as T)
      }
    }
  }

  return result
}

/**
 * Get all events that should appear on a given date (including recurring events)
 */
export function getEventsForDate<T extends { date: string; recurrence?: any; parentEventId?: string | null; id: string }>(
  events: T[],
  date: Date
): T[] {
  const dateStr = formatDate(date)
  const result: T[] = []

  for (const event of events) {
    // Skip if this is a recurring instance (we'll handle the parent)
    if (event.parentEventId) continue

    // Direct match
    if (event.date === dateStr) {
      result.push(event)
      continue
    }

    // Check recurrence
    if (event.recurrence) {
      if (matchesRecurrence(dateStr, event.date, event.recurrence)) {
        // Create a virtual instance for this date
        result.push({
          ...event,
          date: dateStr, // Override with the instance date
          parentEventId: event.id, // Mark as instance
        } as T)
      }
    }
  }

  return result
}
