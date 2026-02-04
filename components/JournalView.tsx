'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate } from '@/lib/utils'
import { format } from 'date-fns'
import { JournalPanel } from './JournalPanel'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/types'

interface JournalViewProps {
  selectedDate: Date
  navigate: (view: ViewMode, date?: Date) => void
}

export function JournalView({ selectedDate, navigate }: JournalViewProps) {
  const store = useStore()
  const [viewingEntry, setViewingEntry] = useState<string | null>(null)
  const entries = store.getAllJournalEntries()

  if (viewingEntry) {
    const date = new Date(viewingEntry)
    return (
      <div className="h-full flex flex-col bg-warm-white">
        <div className="p-6 border-b border-sage">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setViewingEntry(null)}
              className="flex items-center gap-2 text-sm text-faded-green hover:text-masters-green transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to List</span>
            </button>
            <h1 className="font-display text-xl text-masters-green">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <JournalPanel date={date} />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-warm-white">
      <div className="p-6 border-b border-sage">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('monthly')}
            className="flex items-center gap-2 text-sm text-faded-green hover:text-masters-green transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <h1 className="font-display text-2xl text-masters-green">Journal Entries</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {entries.length === 0 ? (
          <div className="text-center text-faded-green py-12">
            <p className="text-sm">No journal entries yet.</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {entries.map((entry) => {
              const date = new Date(entry.date)
              // Extract preview text from HTML (simple approach)
              const preview = entry.content
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
                .substring(0, 60)
              
              return (
                <button
                  key={entry.date}
                  onClick={() => setViewingEntry(entry.date)}
                  className="w-full text-left p-4 rounded border border-sage bg-parchment hover:bg-warm-white hover:border-masters-green/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-masters-green mb-1">
                        {format(date, 'EEEE, MMMM d, yyyy')}
                      </div>
                      {preview && (
                        <div className="text-sm text-faded-green line-clamp-2">
                          {preview}...
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
