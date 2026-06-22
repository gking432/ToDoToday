'use client'

import { X } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useGitHubSync } from '@/hooks/useGitHubSync'
import { DEFAULT_GITHUB_REPO } from '@/lib/github/config'

interface SettingsPanelProps {
  onClose: () => void
}

function formatSyncTime(iso: string | null) {
  if (!iso) return 'Never'
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { inverted, toggleInverted, colors } = useTheme()
  const {
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
  } = useGitHubSync()

  const statusColor =
    status === 'error' ? '#F78FB3' : status === 'ok' ? colors.muted : colors.muted

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2500,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          animation: 'fadeIn 0.2s ease-in',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: '12px',
          right: '12px',
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          zIndex: 2501,
          backgroundColor: colors.surface,
          borderRadius: '16px',
          boxShadow: colors.shadow,
          padding: '20px',
          maxHeight: 'min(85dvh, 640px)',
          overflowY: 'auto',
          animation: 'settingsSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '22px',
              fontWeight: 600,
              color: colors.heading,
              margin: 0,
            }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: colors.muted,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label
            className="flex items-center justify-between"
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: colors.surfaceAlt,
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.text,
                }}
              >
                Invert colors
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: colors.muted,
                  marginTop: '2px',
                }}
              >
                Swap green and white throughout the app
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={inverted}
              onClick={toggleInverted}
              style={{
                width: '48px',
                height: '28px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: inverted ? colors.primary : colors.mutedBg,
                position: 'relative',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background-color 0.2s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: inverted ? '23px' : '3px',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s ease',
                }}
              />
            </button>
          </label>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: colors.surfaceAlt,
              border: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    color: colors.text,
                  }}
                >
                  GitHub sync
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: colors.muted,
                    marginTop: '2px',
                  }}
                >
                  Sync tasks & events via a private repo file
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled(!enabled)}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: enabled ? colors.primary : colors.mutedBg,
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: enabled ? '23px' : '3px',
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s ease',
                  }}
                />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: 500,
                    color: colors.muted,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Repository
                </label>
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  placeholder={DEFAULT_GITHUB_REPO}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: colors.text,
                    backgroundColor: colors.surface,
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    fontWeight: 500,
                    color: colors.muted,
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Personal access token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="github_pat_…"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    color: colors.text,
                    backgroundColor: colors.surface,
                    outline: 'none',
                  }}
                />
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: colors.muted,
                    marginTop: '6px',
                    lineHeight: 1.4,
                  }}
                >
                  Create a fine-grained token with <strong>Contents: Read and write</strong> on your
                  repo. Works with private repos. Stored only on this device.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void testConnection()}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${colors.border}`,
                    backgroundColor: colors.surface,
                    color: colors.text,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Test connection
                </button>
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  disabled={!enabled || !token || status === 'syncing'}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: enabled && token ? colors.primary : colors.mutedBg,
                    color: '#FFFFFF',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: enabled && token ? 'pointer' : 'not-allowed',
                    opacity: status === 'syncing' ? 0.7 : 1,
                  }}
                >
                  Sync now
                </button>
              </div>

              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: statusColor,
                  lineHeight: 1.4,
                }}
              >
                {status === 'syncing' ? statusMessage : statusMessage || `Last sync: ${formatSyncTime(lastSyncAt)}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
