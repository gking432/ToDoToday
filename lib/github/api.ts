import { SYNC_FILE_PATH } from './config'
import type { SyncBundle } from './types'

function githubHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\n/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export type FetchSyncResult =
  | { kind: 'found'; bundle: SyncBundle; sha: string }
  | { kind: 'missing' }

export async function fetchSyncBundle(
  token: string,
  owner: string,
  repo: string
): Promise<FetchSyncResult> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${SYNC_FILE_PATH}`,
    { headers: githubHeaders(token) }
  )

  if (res.status === 404) return { kind: 'missing' }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub read failed (${res.status}): ${body}`)
  }

  const data = await res.json()
  const parsed = JSON.parse(fromBase64Utf8(data.content)) as SyncBundle
  return { kind: 'found', bundle: parsed, sha: data.sha }
}

export async function pushSyncBundle(
  token: string,
  owner: string,
  repo: string,
  bundle: SyncBundle,
  sha?: string
): Promise<void> {
  const body: Record<string, string> = {
    message: 'Sync ToDoToday data',
    content: toBase64Utf8(JSON.stringify(bundle, null, 2)),
  }
  if (sha) body.sha = sha

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${SYNC_FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        ...githubHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub write failed (${res.status}): ${text}`)
  }
}

export async function testGitHubConnection(
  token: string,
  owner: string,
  repo: string
): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: githubHeaders(token),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cannot access repo (${res.status}): ${text}`)
  }
  const data = await res.json()
  return data.private ? 'Connected (private repo)' : 'Connected (public repo)'
}
