'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react'
import { useStore } from '@/hooks/useStore'
import { fetchSyncBundle, pushSyncBundle, testGitHubConnection } from '@/lib/github/api'
import { createSyncBundle } from '@/lib/github/types'
import {
  getGitHubToken,
  setGitHubToken,
  isGitHubSyncEnabled,
  setGitHubSyncEnabled,
  getGitHubRepo,
  setGitHubRepo,
  getLastSyncAt,
  setLastSyncAt,
  getLocalSyncUpdatedAt,
  setLocalSyncUpdatedAt,
  parseRepoSlug,
} from '@/lib/github/settings'

export type GitHubSyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

interface GitHubSyncContextType {
  enabled: boolean
  setEnabled: (value: boolean) => void
  token: string
  setToken: (value: string) => void
  repo: string
  setRepo: (value: string) => void
  status: GitHubSyncStatus
  statusMessage: string
  lastSyncAt: string | null
  syncNow: () => Promise<void>
  testConnection: () => Promise<void>
}

const GitHubSyncContext = createContext<GitHubSyncContextType | undefined>(undefined)

const DEBOUNCE_MS = 2500

export function GitHubSyncProvider({ children }: { children: ReactNode }) {
  const { tasks, events, journal, projects, applySyncBundle, getSyncSnapshot } = useStore()
  const [enabled, setEnabledState] = useState(false)
  const [token, setTokenState] = useState('')
  const [repo, setRepoState] = useState('')
  const [status, setStatus] = useState<GitHubSyncStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [lastSyncAt, setLastSyncAtState] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  const isApplyingRemoteRef = useRef(false)
  const remoteShaRef = useRef<string | undefined>(undefined)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialSyncDoneRef = useRef(false)
  const readyForPushRef = useRef(false)
  const isSyncingRef = useRef(false)

  useEffect(() => {
    setEnabledState(isGitHubSyncEnabled())
    setTokenState(getGitHubToken())
    setRepoState(getGitHubRepo())
    setLastSyncAtState(getLastSyncAt())
    setHydrated(true)
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setGitHubSyncEnabled(value)
    setEnabledState(value)
    if (value) {
      initialSyncDoneRef.current = false
      readyForPushRef.current = false
    }
  }, [])

  const setToken = useCallback((value: string) => {
    setGitHubToken(value.trim())
    setTokenState(value.trim())
    initialSyncDoneRef.current = false
  }, [])

  const setRepo = useCallback((value: string) => {
    const next = value.trim()
    setGitHubRepo(next)
    setRepoState(next)
    initialSyncDoneRef.current = false
  }, [])

  const runSync = useCallback(
    async (mode: 'merge' | 'push-only' = 'merge') => {
      if (!enabled || !token || isSyncingRef.current) return

      const parsed = parseRepoSlug(repo)
      if (!parsed) {
        setStatus('error')
        setStatusMessage('Repo must be in owner/name format (e.g. gking432/ToDoToday)')
        return
      }

      isSyncingRef.current = true
      setStatus('syncing')
      setStatusMessage('Syncing…')

      try {
        const localUpdatedAt = getLocalSyncUpdatedAt()
        const snapshot = getSyncSnapshot()
        const remote = await fetchSyncBundle(token, parsed.owner, parsed.repo)

        if (remote.kind === 'missing') {
          const bundle = createSyncBundle(snapshot)
          await pushSyncBundle(token, parsed.owner, parsed.repo, bundle)
          remoteShaRef.current = undefined
          const now = bundle.updatedAt
          setLocalSyncUpdatedAt(now)
          setLastSyncAt(now)
          setLastSyncAtState(now)
          setStatus('ok')
          setStatusMessage('Created sync file on GitHub')
          return
        }

        remoteShaRef.current = remote.sha
        const remoteTime = new Date(remote.bundle.updatedAt).getTime()
        const localTime = localUpdatedAt ? new Date(localUpdatedAt).getTime() : 0

        if (mode === 'merge' && remoteTime > localTime) {
          isApplyingRemoteRef.current = true
          applySyncBundle(remote.bundle)
          isApplyingRemoteRef.current = false
          setLastSyncAt(remote.bundle.updatedAt)
          setLastSyncAtState(remote.bundle.updatedAt)
          setStatus('ok')
          setStatusMessage('Pulled latest from GitHub')
          return
        }

        const bundle = createSyncBundle(snapshot)
        try {
          await pushSyncBundle(token, parsed.owner, parsed.repo, bundle, remoteShaRef.current)
        } catch (pushErr) {
          const msg = pushErr instanceof Error ? pushErr.message : String(pushErr)
          if (msg.includes('409') && mode === 'push-only') {
            isSyncingRef.current = false
            await runSync('merge')
            return
          }
          throw pushErr
        }
        setLocalSyncUpdatedAt(bundle.updatedAt)
        setLastSyncAt(bundle.updatedAt)
        setLastSyncAtState(bundle.updatedAt)
        setStatus('ok')
        setStatusMessage('Saved to GitHub')
      } catch (err) {
        console.error('[github-sync]', err)
        setStatus('error')
        setStatusMessage(err instanceof Error ? err.message : 'Sync failed')
      } finally {
        isSyncingRef.current = false
      }
    },
    [enabled, token, repo, getSyncSnapshot, applySyncBundle]
  )

  const syncNow = useCallback(async () => {
    await runSync('push-only')
  }, [runSync])

  const testConnection = useCallback(async () => {
    if (!token) {
      setStatus('error')
      setStatusMessage('Enter a personal access token first')
      return
    }
    const parsed = parseRepoSlug(repo)
    if (!parsed) {
      setStatus('error')
      setStatusMessage('Repo must be in owner/name format')
      return
    }
    setStatus('syncing')
    setStatusMessage('Testing connection…')
    try {
      const msg = await testGitHubConnection(token, parsed.owner, parsed.repo)
      setStatus('ok')
      setStatusMessage(msg)
    } catch (err) {
      setStatus('error')
      setStatusMessage(err instanceof Error ? err.message : 'Connection failed')
    }
  }, [token, repo])

  // Initial merge sync after local hydration
  useEffect(() => {
    if (!hydrated || !enabled || !token || initialSyncDoneRef.current) return
    initialSyncDoneRef.current = true
    readyForPushRef.current = false
    void runSync('merge').finally(() => {
      readyForPushRef.current = true
    })
  }, [hydrated, enabled, token, repo, runSync])

  // Debounced push on data changes
  useEffect(() => {
    if (!hydrated || !enabled || !token || !readyForPushRef.current || isApplyingRemoteRef.current) return

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    pushTimerRef.current = setTimeout(() => {
      void runSync('push-only')
    }, DEBOUNCE_MS)

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current)
    }
  }, [tasks, events, journal, projects, hydrated, enabled, token, runSync])

  // Pull when app becomes visible again
  useEffect(() => {
    if (!hydrated || !enabled || !token) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void runSync('merge')
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [hydrated, enabled, token, runSync])

  const value: GitHubSyncContextType = {
    enabled,
    setEnabled,
    token,
    setToken,
    repo,
    setRepo,
    status,
    statusMessage,
    lastSyncAt,
    syncNow,
    testConnection,
  }

  return React.createElement(GitHubSyncContext.Provider, { value }, children)
}

export function useGitHubSync() {
  const context = useContext(GitHubSyncContext)
  if (context === undefined) {
    throw new Error('useGitHubSync must be used within a GitHubSyncProvider')
  }
  return context
}
