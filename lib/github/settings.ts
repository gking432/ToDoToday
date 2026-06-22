import {
  GITHUB_TOKEN_KEY,
  GITHUB_SYNC_ENABLED_KEY,
  GITHUB_REPO_KEY,
  GITHUB_LAST_SYNC_KEY,
  LOCAL_SYNC_UPDATED_AT_KEY,
} from '@/lib/storage-keys'
import { DEFAULT_GITHUB_REPO } from './config'

export function getGitHubToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(GITHUB_TOKEN_KEY) || ''
}

export function setGitHubToken(token: string) {
  if (typeof window === 'undefined') return
  if (token) localStorage.setItem(GITHUB_TOKEN_KEY, token)
  else localStorage.removeItem(GITHUB_TOKEN_KEY)
}

export function isGitHubSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(GITHUB_SYNC_ENABLED_KEY) === 'true'
}

export function setGitHubSyncEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(GITHUB_SYNC_ENABLED_KEY, String(enabled))
}

export function getGitHubRepo(): string {
  if (typeof window === 'undefined') return DEFAULT_GITHUB_REPO
  return localStorage.getItem(GITHUB_REPO_KEY) || DEFAULT_GITHUB_REPO
}

export function setGitHubRepo(repo: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(GITHUB_REPO_KEY, repo.trim() || DEFAULT_GITHUB_REPO)
}

export function getLastSyncAt(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(GITHUB_LAST_SYNC_KEY)
}

export function setLastSyncAt(iso: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(GITHUB_LAST_SYNC_KEY, iso)
}

export function getLocalSyncUpdatedAt(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(LOCAL_SYNC_UPDATED_AT_KEY) || ''
}

export function setLocalSyncUpdatedAt(iso: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_SYNC_UPDATED_AT_KEY, iso)
}

export function parseRepoSlug(slug: string): { owner: string; repo: string } | null {
  const trimmed = slug.trim()
  const match = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}
