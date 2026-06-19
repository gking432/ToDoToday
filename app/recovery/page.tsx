'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TASKS_KEY,
  JOURNAL_KEY,
  EVENTS_KEY,
  PROJECTS_KEY,
} from '@/lib/storage-keys'
import type { Task, Event, JournalEntry, Project } from '@/types'

type Backup = {
  tasks: Task[]
  events: Event[]
  journal: Record<string, JournalEntry>
  projects: Project[]
}

function readBackupFromStorage(): Backup {
  if (typeof window === 'undefined') {
    return { tasks: [], events: [], journal: {}, projects: [] }
  }
  try {
    return {
      tasks: JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'),
      events: JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]'),
      journal: JSON.parse(localStorage.getItem(JOURNAL_KEY) || '{}'),
      projects: JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'),
    }
  } catch {
    return { tasks: [], events: [], journal: {}, projects: [] }
  }
}

export default function RecoveryPage() {
  const [backup, setBackup] = useState<Backup | null>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    setBackup(readBackupFromStorage())
  }, [])

  const counts = backup
    ? {
        tasks: backup.tasks.length,
        events: backup.events.length,
        journal: Object.keys(backup.journal).length,
        projects: backup.projects.length,
      }
    : null

  const downloadBackup = useCallback(() => {
    const data = backup ?? readBackupFromStorage()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `todoToday-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Downloaded backup file.')
  }, [backup])

  const uploadBackupFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Backup
        setBackup({
          tasks: parsed.tasks ?? [],
          events: parsed.events ?? [],
          journal: parsed.journal ?? {},
          projects: parsed.projects ?? [],
        })
        setStatus('Backup file loaded. Review counts below, then restore.')
      } catch {
        setStatus('Invalid backup file.')
      }
    }
    reader.readAsText(file)
  }, [])

  const restoreToDevice = useCallback(() => {
    const data = backup ?? readBackupFromStorage()
    localStorage.setItem(TASKS_KEY, JSON.stringify(data.tasks))
    localStorage.setItem(EVENTS_KEY, JSON.stringify(data.events))
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(data.journal))
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(data.projects))
    setStatus('Saved to this browser. Open the home page (refresh once).')
  }, [backup])

  return (
    <div className="min-h-screen bg-[#006747] p-6 text-white">
      <div className="mx-auto max-w-lg rounded-xl bg-white p-6 text-gray-900 shadow-lg">
        <h1 className="mb-2 text-xl font-semibold">Data recovery</h1>
        <p className="mb-4 text-sm text-gray-600">
          Download or restore your tasks, events, and project notes from this device.
        </p>

        {counts && (
          <ul className="mb-4 list-inside list-disc text-sm">
            <li>{counts.tasks} tasks</li>
            <li>{counts.projects} projects</li>
            <li>{counts.events} events</li>
            <li>{counts.journal} journal entries</li>
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={downloadBackup}
            className="rounded-lg bg-[#006747] px-4 py-2 text-sm font-medium text-white"
          >
            Download backup file
          </button>

          <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-center text-sm">
            Load backup file
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) uploadBackupFile(f)
              }}
            />
          </label>

          <button
            type="button"
            onClick={restoreToDevice}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            Restore to this browser
          </button>
        </div>

        {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}

        <Link href="/" className="mt-4 inline-block text-sm text-[#006747] underline">
          Back to app
        </Link>
      </div>
    </div>
  )
}
