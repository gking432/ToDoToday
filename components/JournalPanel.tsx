'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { X } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { formatDate, getWhimsicalPrompt } from '@/lib/utils'

interface JournalPanelProps {
  date: Date
}

export function JournalPanel({ date }: JournalPanelProps) {
  const store = useStore()
  const dateStr = formatDate(date)
  const entry = store.getJournalEntry(dateStr)
  const prompt = getWhimsicalPrompt(date)
  const [showPrompt, setShowPrompt] = useState(true)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        orderedList: false,
      }),
    ],
    content: entry?.content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        store.saveJournalEntry(dateStr, editor.getHTML())
      }, 500)
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.commands.setContent(entry?.content || '')
  }, [dateStr])

  useEffect(() => {
    // Reset prompt visibility when date changes
    setShowPrompt(true)
  }, [dateStr])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const ToolbarButton = ({
    active,
    onClick,
    children,
  }: {
    active: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-center transition-all duration-150"
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        backgroundColor: active ? '#E8EFE6' : 'transparent',
        color: active ? '#006747' : '#5A7A5E',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '13px',
        border: 'none',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = '#F5F9F7'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Green header — title + toolbar */}
      <div className="card-header flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Journal</h2>

          {/* Toolbar — right-aligned in the green header */}
          {editor && (
            <div className="flex items-center gap-0.5">
              <ToolbarButton
                active={editor.isActive('bold')}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <strong>B</strong>
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive('italic')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <em>I</em>
              </ToolbarButton>
              <ToolbarButton
                active={editor.isActive('bulletList')}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                •—
              </ToolbarButton>
            </div>
          )}
        </div>
      </div>

      {/* White body — prompt + editor */}
      <div className="flex-1 overflow-y-auto flex flex-col" style={{ minHeight: 0 }}>
        {/* Whimsical prompt — ghosted, skippable, sits at the top of the white area */}
        {showPrompt && (
          <div style={{ padding: '16px 24px 0', flexShrink: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', right: '20px', zIndex: 100 }}>
              <button
                onClick={() => setShowPrompt(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#5A7A5E',
                  padding: '0',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                  borderRadius: '4px',
                  width: '32px',
                  height: '32px',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1'
                  e.currentTarget.style.color = '#1A2E1A'
                  e.currentTarget.style.backgroundColor = '#F5F9F7'
                  const tooltip = e.currentTarget.parentElement?.querySelector('[data-tooltip]') as HTMLElement
                  if (tooltip) {
                    tooltip.style.display = 'block'
                    requestAnimationFrame(() => {
                      tooltip.style.opacity = '1'
                    })
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.6'
                  e.currentTarget.style.color = '#5A7A5E'
                  e.currentTarget.style.backgroundColor = 'transparent'
                  const tooltip = e.currentTarget.parentElement?.querySelector('[data-tooltip]') as HTMLElement
                  if (tooltip) {
                    tooltip.style.opacity = '0'
                    setTimeout(() => {
                      tooltip.style.display = 'none'
                    }, 200)
                  }
                }}
              >
                <X size={18} style={{ pointerEvents: 'none' }} />
              </button>
              <div
                data-tooltip
                style={{
                  position: 'absolute',
                  right: '100%',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginRight: '8px',
                  backgroundColor: '#FFFFFF',
                  color: '#006747',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap',
                  opacity: 0,
                  pointerEvents: 'none',
                  transition: 'opacity 0.2s ease',
                  zIndex: 200,
                  display: 'none',
                }}
              >
                Hide prompt
              </div>
            </div>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '13px',
                fontStyle: 'italic',
                color: '#5A7A5E',
                opacity: 0.6,
                lineHeight: 1.5,
                margin: 0,
                paddingRight: '32px',
              }}
            >
              {prompt}
            </p>
            {/* Subtle divider under prompt */}
            <div
              style={{
                height: '1px',
                backgroundColor: '#E8EFE6',
                marginTop: '14px',
              }}
            />
          </div>
        )}

        {/* TipTap editor — in its own constrained container */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}