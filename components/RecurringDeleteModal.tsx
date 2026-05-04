'use client'

import { createPortal } from 'react-dom'

type Variant = 'task' | 'event'

interface RecurringDeleteModalProps {
  open: boolean
  variant: Variant
  /** True when deleting an occurrence that belongs to a recurring series */
  isRecurring: boolean
  onCancel: () => void
  /** Delete the entire series */
  onDeleteSeries: () => void
  /** Remove only this occurrence (exclude date on parent) */
  onDeleteSingle: () => void
  /** Plain delete when not recurring */
  onDeletePlain?: () => void
}

export function RecurringDeleteModal({
  open,
  variant,
  isRecurring,
  onCancel,
  onDeleteSeries,
  onDeleteSingle,
  onDeletePlain,
}: RecurringDeleteModalProps) {
  if (!open || typeof window === 'undefined') return null

  const seriesLabel = variant === 'task' ? 'Delete recurring tasks' : 'Delete recurring events'
  const singleLabel = variant === 'task' ? 'Delete single task' : 'Delete single event'

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 4px 24px rgba(0, 40, 25, 0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '16px',
            fontWeight: 600,
            color: '#1A2E1A',
            marginBottom: '12px',
          }}
        >
          {isRecurring ? 'Delete repeating item?' : 'Are you sure you want to delete?'}
        </h3>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            color: '#5A7A5E',
            marginBottom: '20px',
          }}
        >
          {isRecurring
            ? 'Choose whether to remove the entire series or only this date.'
            : 'This will be permanently removed.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #E8EFE6',
              backgroundColor: 'transparent',
              color: '#5A7A5E',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          {isRecurring ? (
            <>
              <button
                type="button"
                onClick={onDeleteSingle}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #006747',
                  backgroundColor: '#FFFFFF',
                  color: '#006747',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {singleLabel}
              </button>
              <button
                type="button"
                onClick={onDeleteSeries}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#006747',
                  color: '#FFFFFF',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {seriesLabel}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDeletePlain}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#006747',
                color: '#FFFFFF',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
