'use client'

import { X } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { inverted, toggleInverted, colors } = useTheme()

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
      </div>
    </>
  )
}
