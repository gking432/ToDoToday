'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useStore } from '@/hooks/useStore'
import { ProjectNotesPanel } from './ProjectNotesPanel'
import type { ViewMode } from '@/types'

interface ProjectNotesViewProps {
  navigate: (view: ViewMode, date?: Date) => void
  isExpanded?: boolean
  onExpand?: () => void
  onCollapse?: () => void
}

export function ProjectNotesView({ navigate, isExpanded = false, onExpand, onCollapse }: ProjectNotesViewProps) {
  const store = useStore()
  const projects = store.getAllProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  )
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null)
  const [renamingProjectName, setRenamingProjectName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  // Update selected project when projects change
  useEffect(() => {
    if (projects.length > 0 && (!selectedProjectId || !projects.find(p => p.id === selectedProjectId))) {
      setSelectedProjectId(projects[0].id)
    } else if (projects.length === 0) {
      setSelectedProjectId(null)
    }
  }, [projects, selectedProjectId])

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      const projectId = store.addProject(newProjectName.trim())
      const trimmedName = newProjectName.trim()
      setNewProjectName('')
      setIsCreatingProject(false)
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        setSelectedProjectId(projectId)
      }, 0)
    }
  }

  const handleDeleteProject = (id: string) => {
    setProjectToDelete(id)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteProject = () => {
    if (!projectToDelete) return
    
    store.deleteProject(projectToDelete)
    const remainingProjects = projects.filter(p => p.id !== projectToDelete)
    if (remainingProjects.length > 0) {
      setSelectedProjectId(remainingProjects[0].id)
    } else {
      setSelectedProjectId(null)
    }
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  // Main view with tabs
  return (
    <div className="flex flex-col h-full">
      {/* Green header with tabs */}
      <div className="card-header flex-shrink-0" style={{ paddingBottom: '0', borderBottom: 'none', paddingRight: '12px' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            Project Notes
          </h1>
          <div className="flex items-center gap-2">
            {!isExpanded && onExpand && (
              <button
                onClick={onExpand}
                className="flex items-center gap-1.5 transition-colors duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: '#5A7A5E',
                  background: 'none',
                  border: 'none',
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
              >
                <span>Expand to top</span>
                <ChevronUp size={12} strokeWidth={1.8} />
              </button>
            )}
            {isExpanded && onCollapse && (
              <button
                onClick={onCollapse}
                className="flex items-center gap-1.5 transition-colors duration-200"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: '#5A7A5E',
                  background: 'none',
                  border: 'none',
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#006747')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#5A7A5E')}
              >
                <ChevronDown size={12} strokeWidth={1.8} />
                <span>Collapse</span>
              </button>
            )}
            {selectedProjectId && (
              <button
                onClick={() => handleDeleteProject(selectedProjectId)}
                className="flex items-center justify-center transition-colors duration-200"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#E8EFE6',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#006747',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F78FB3'
                  e.currentTarget.style.color = '#FFFFFF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8EFE6'
                  e.currentTarget.style.color = '#006747'
                }}
              >
                <Trash2 size={18} strokeWidth={2.5} />
              </button>
            )}
            <button
              onClick={() => setIsCreatingProject(true)}
              className="flex items-center justify-center transition-colors duration-200"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#E8EFE6',
                border: 'none',
                cursor: 'pointer',
                color: '#006747',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C8D5C2'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#E8EFE6'
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-end gap-0 overflow-x-auto" style={{ marginTop: '12px', marginLeft: '-22px', marginRight: '-22px', paddingLeft: '22px', paddingRight: '22px', position: 'relative' }}>
          {/* Border line that spans the width, but gets covered by selected tab */}
          <div 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: '#E8EFE6',
              zIndex: 1,
            }}
          />
          
          {isCreatingProject ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginRight: '8px', marginBottom: '-1px', position: 'relative', zIndex: 2 }}>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProject()
                  } else if (e.key === 'Escape') {
                    setIsCreatingProject(false)
                    setNewProjectName('')
                  }
                }}
                onBlur={(e) => {
                  // Don't close if clicking on a tab
                  const relatedTarget = e.relatedTarget as HTMLElement
                  if (relatedTarget && relatedTarget.closest('[data-project-tab]')) {
                    return
                  }
                  if (newProjectName.trim()) {
                    handleCreateProject()
                  } else {
                    setIsCreatingProject(false)
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px 6px 0 0',
                  border: '1px solid #E8EFE6',
                  borderBottom: 'none',
                  backgroundColor: '#F5F9F7',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                  color: '#1A2E1A',
                  outline: 'none',
                  minWidth: '120px',
                }}
                placeholder="Project name"
              />
            </div>
          ) : null}
          
          {projects.map((project) => {
            const isSelected = selectedProjectId === project.id
            const isRenaming = renamingProjectId === project.id
            
            return (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                  position: 'relative',
                  marginBottom: '-1px',
                  zIndex: isSelected ? 2 : 0,
                }}
              >
                {isRenaming ? (
                  <input
                    type="text"
                    value={renamingProjectName}
                    onChange={(e) => setRenamingProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (renamingProjectName.trim()) {
                          store.updateProject(project.id, { name: renamingProjectName.trim() })
                        }
                        setRenamingProjectId(null)
                        setRenamingProjectName('')
                      } else if (e.key === 'Escape') {
                        setRenamingProjectId(null)
                        setRenamingProjectName('')
                      }
                    }}
                    onBlur={() => {
                      if (renamingProjectName.trim()) {
                        store.updateProject(project.id, { name: renamingProjectName.trim() })
                      }
                      setRenamingProjectId(null)
                      setRenamingProjectName('')
                    }}
                    autoFocus
                    style={{
                      padding: isSelected ? '6px 12px' : '4px 12px',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid #006747',
                      borderBottom: isSelected ? 'none' : '1px solid #006747',
                      backgroundColor: '#FFFFFF',
                      color: '#1A2E1A',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: isSelected ? '12px' : '11px',
                      fontWeight: isSelected ? 600 : 400,
                      outline: 'none',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      marginTop: isSelected ? '4px' : '0',
                      minWidth: '80px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <button
                    data-project-tab
                    onClick={() => {
                      setIsCreatingProject(false)
                      setSelectedProjectId(project.id)
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setRenamingProjectId(project.id)
                      setRenamingProjectName(project.name)
                    }}
                    style={{
                      padding: isSelected ? '6px 12px' : '4px 12px',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid #E8EFE6',
                      borderBottom: isSelected ? 'none' : '1px solid #E8EFE6',
                      backgroundColor: '#FFFFFF',
                      color: isSelected ? '#006747' : '#5A7A5E',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: isSelected ? '12px' : '11px',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                      marginTop: isSelected ? '4px' : '0',
                    }}
                    onMouseEnter={(e) => {
                      // Only change background for unselected tabs
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F5F9F7'
                      }
                    }}
                    onMouseLeave={(e) => {
                      // Always reset to white background
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                    }}
                  >
                    {project.name}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* White body — project notes panel or empty state */}
      <div 
        className="flex-1 overflow-hidden"
        style={{
          borderLeft: '1px solid #E8EFE6',
          borderRight: '1px solid #E8EFE6',
          borderBottom: '1px solid #E8EFE6',
          borderTop: 'none',
          borderRadius: '0 0 12px 18px', // Right bottom corner 12px, left bottom corner 18px
          backgroundColor: '#FFFFFF',
          marginRight: '0', // Ensure no margin extends beyond parent
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scrollable content area — only show when not expanded */}
        {!isExpanded && (
          <div 
            style={{ 
              flex: '1 1 auto',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {selectedProjectId ? (
              <ProjectNotesPanel projectId={selectedProjectId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full" style={{ padding: '40px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#E8EFE6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>📁</span>
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#5A7A5E',
                    textAlign: 'center',
                  }}
                >
                  No projects yet.<br />
                  <span style={{ opacity: 0.7 }}>Click the + button to create a new project.</span>
                </p>
              </div>
            )}

          </div>
        )}

        {/* Expanded view — takes full height */}
        {isExpanded && (
          <div 
            style={{ 
              flex: '1 1 auto',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
          >
            {selectedProjectId ? (
              <ProjectNotesPanel projectId={selectedProjectId} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full" style={{ padding: '40px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#E8EFE6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>📁</span>
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#5A7A5E',
                    textAlign: 'center',
                  }}
                >
                  No projects yet.<br />
                  <span style={{ opacity: 0.7 }}>Click the + button to create a new project.</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation popup — use portal to render at document.body level */}
      {showDeleteConfirm && typeof window !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) {
              setShowDeleteConfirm(false)
              setProjectToDelete(null)
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
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
              Are you sure you want to delete this project?
            </h3>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                color: '#5A7A5E',
                marginBottom: '20px',
              }}
            >
              Deleting this project will lose these notes forever. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setProjectToDelete(null)
                }}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F9F7'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  confirmDeleteProject()
                }}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#005238'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#006747'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
