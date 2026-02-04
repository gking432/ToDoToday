export interface Subtask {
  id: string
  text: string
  completed: boolean
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number // e.g., every 2 weeks, every 3 days
  endDate?: string | null // ISO date string - when recurrence ends (null = no end)
  endAfter?: number | null // Number of occurrences (null = no limit)
  daysOfWeek?: number[] // For weekly: [0=Sunday, 1=Monday, ..., 6=Saturday]
}

export interface Task {
  id: string
  text: string
  completed: boolean
  completedAt: string | null // ISO datetime string - when task was completed, null if not completed
  dueDate: string | null // ISO date string (date only, no time) or null
  priority: 'low' | 'medium' | 'high' | null
  scheduledSlots: ScheduledSlot[]
  createdAt: string // ISO datetime string
  order: number // user-controlled sort order
  subtasks?: Subtask[] // Optional array of subtasks/bullet points
  recurrence?: RecurrencePattern | null // Recurrence pattern for repeating tasks
  parentTaskId?: string | null // If this is an instance of a recurring task, reference the parent
  completedDates?: string[] // For recurring tasks: array of ISO date strings when task was completed
}

export interface ScheduledSlot {
  date: string // ISO date string
  hour: number // 6–23
}

export interface Event {
  id: string
  text: string
  date: string // ISO date string
  hour: number // 0–23 (start hour) - not used if allDay is true
  minutes?: number // 0–59 (start minutes, default 0) - not used if allDay is true
  endHour?: number // Optional end hour for time range - not used if allDay is true
  endMinutes?: number // Optional end minutes for time range - not used if allDay is true
  location?: string // Optional location
  allDay?: boolean // If true, event has no specific time slot
  createdAt: string // ISO datetime string
  sourceTaskId?: string // If this event was created from a task, reference the original task
  recurrence?: RecurrencePattern | null // Recurrence pattern for repeating events
  parentEventId?: string | null // If this is an instance of a recurring event, reference the parent
}

export interface JournalEntry {
  date: string // ISO date string — this is the key
  content: string // TipTap HTML output
  updatedAt: string // ISO datetime for display
}

export interface Project {
  id: string
  name: string
  content: string // TipTap HTML output
  createdAt: string // ISO datetime string
  updatedAt: string // ISO datetime string
}

export type ViewMode = 'daily' | 'hourly' | 'monthly' | 'project-notes'

export const WHIMSICAL_PROMPTS = [
  "What question have you been avoiding asking yourself?",
  "If silence had a shape, what would yours look like today?",
  "What do you know now that you wish you understood then?",
  "Where does your mind go when it's not being watched?",
  "What's the difference between what you want and what you need?",
  "If you could unlearn one thing, what would it be?",
  "What are you holding onto that's holding you back?",
  "When was the last time you changed your mind about something important?",
  "What would you do if you weren't afraid of what others think?",
  "What's the story you tell yourself that might not be true?",
  "If you could see yourself from someone else's perspective, what would surprise you?",
  "What's the question you're most afraid to answer?",
  "What do you know in your bones but can't prove?",
  "What would you do differently if you knew you couldn't fail?",
  "What's the gap between who you are and who you pretend to be?",
  "What are you waiting for permission to do?",
  "If you could give your younger self one piece of advice, what would you say?",
  "What's the truth you're not ready to admit?",
  "What would you do if you had nothing to lose?",
  "What's the thing you're most afraid of losing?",
  "What does your future self wish you knew now?",
  "What's the lie you tell yourself most often?",
  "What would you do if you weren't trying to prove anything?",
  "What's the question that keeps you up at night?",
  "What are you running from that's actually running toward you?",
  "What would you do if you trusted yourself completely?",
  "What's the thing you know you should do but keep putting off?",
  "What would change if you stopped waiting for the right moment?",
  "What's the difference between who you are and who you want to be?",
  "What would you do if you knew this was your last chance?",
]
