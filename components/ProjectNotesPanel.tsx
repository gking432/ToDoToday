'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useStore } from '@/hooks/useStore'
import { format } from 'date-fns'

interface ProjectNotesPanelProps {
  projectId: string
}

export function ProjectNotesPanel({ projectId }: ProjectNotesPanelProps) {
  const store = useStore()
  const project = store.getProject(projectId)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showTimestamp, setShowTimestamp] = useState(false)
  const [timestamp, setTimestamp] = useState<string>('')
  const timestampTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    content: project?.content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Show timestamp when typing
      const now = new Date()
      const newTimestamp = format(now, 'h:mm a')
      setTimestamp(newTimestamp)
      setShowTimestamp(true)
      
      // Keep timestamp visible while typing, hide after 3 seconds of no typing
      if (timestampTimeoutRef.current) clearTimeout(timestampTimeoutRef.current)
      timestampTimeoutRef.current = setTimeout(() => {
        setShowTimestamp(false)
      }, 3000)
      
      // Save content
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        store.saveProjectContent(projectId, editor.getHTML())
      }, 500)
    },
  })

  // Only update editor content when projectId changes, not when content is saved
  useEffect(() => {
    if (!editor || !projectId) return
    
    // Get fresh project from store to avoid stale closure
    const currentProject = store.getProject(projectId)
    if (!currentProject) return
    
    // Only set content when projectId changes (switching projects)
    // Don't update when project.content changes (which happens on save)
    const currentContent = editor.getHTML()
    const projectContent = currentProject.content || ''
    
    // Only update if content is actually different (e.g., switching projects)
    // This prevents cursor jumping when user is typing and content is auto-saved
    if (currentContent !== projectContent) {
      editor.commands.setContent(projectContent, false) // false = don't emit update event
    }
  }, [projectId, editor, store]) // Only depend on projectId, not project object

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (timestampTimeoutRef.current) clearTimeout(timestampTimeoutRef.current)
    }
  }, [])

  if (!project) return null

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
      {/* White body — editor */}
      <div className="flex-1 overflow-y-auto flex flex-col" style={{ minHeight: 0, position: 'relative' }}>
        {/* TipTap editor — in its own constrained container */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* Toolbar — floating at top right of editor content */}
          {editor && (
            <div 
              style={{ 
                position: 'absolute', 
                top: '8px', 
                right: '12px', 
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '4px 8px',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
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

          {/* Timestamp indicator */}
          {showTimestamp && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '24px',
                zIndex: 100,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                color: '#006747',
                backgroundColor: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                border: '1px solid #E8EFE6',
                pointerEvents: 'none',
                fontWeight: 500,
              }}
            >
              {timestamp}
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', paddingTop: '20px' }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  )
}
