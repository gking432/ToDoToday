'use client'

import { useState, useEffect } from 'react'
import { ToDoList } from './ToDoList'
import { DailyView } from './DailyView'
import { HourlyView } from './HourlyView'
import { MonthlyView } from './MonthlyView'
import { ProjectNotesView } from './ProjectNotesView'
import { UpcomingEvents } from './UpcomingEvents'
import { Navigation } from './Navigation'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import type { ViewMode } from '@/types'

export function ToDoTodayApp() {
  const [activeView, setActiveView] = useState<ViewMode>('daily')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dailyExpanded, setDailyExpanded] = useState(false)
  const [projectNotesExpanded, setProjectNotesExpanded] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [timeFullScreen, setTimeFullScreen] = useState(false)
  const [timeHovered, setTimeHovered] = useState(false)
  const [showFullViewText, setShowFullViewText] = useState(false)
  const [middleColumnWidth, setMiddleColumnWidth] = useState<number>(0)

  // Calculate middle column width (space between ToDoList and MonthlyView)
  useEffect(() => {
    const calculateWidth = () => {
      if (typeof window === 'undefined') return
      const viewportWidth = window.innerWidth
      const leftWidth = 280 // ToDoList width
      const rightWidth = viewportWidth * 0.5 // MonthlyView is 50vw
      const gaps = 16 * 3 // 3 gaps (left-middle, middle-right, padding)
      const availableWidth = viewportWidth - leftWidth - rightWidth - gaps
      setMiddleColumnWidth(Math.max(340, availableWidth)) // Min 340px
    }
    
    calculateWidth()
    window.addEventListener('resize', calculateWidth)
    return () => window.removeEventListener('resize', calculateWidth)
  }, [])

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Show "Full View" text after 1 second when full screen opens
  useEffect(() => {
    if (timeFullScreen) {
      setShowFullViewText(false)
      const timer = setTimeout(() => {
        setShowFullViewText(true)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setShowFullViewText(false)
    }
  }, [timeFullScreen])

  const navigate = (view: ViewMode, date?: Date) => {
    setActiveView(view)
    if (date) setSelectedDate(date)
    // Reset expansion when navigating away from daily view
    if (view !== 'daily') {
      setDailyExpanded(false)
    }
  }

  // In daily view: three cards side by side (todo | day | project notes)
  // In all other views: todo card on left, single wide card on right
  const isDailyView = activeView === 'daily'

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex gap-4 p-4 flex-1" style={{ minWidth: 0, position: 'relative' }}>
        {/* LEFT SIDE — Time display and To-Do List */}
        <div 
          className="flex flex-col gap-4 flex-shrink-0" 
          style={{ 
            width: '280px', // Fixed width
            flexShrink: 0,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* TIME DISPLAY — No background, centered, large */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              padding: '0',
              position: 'relative',
              cursor: 'pointer',
            }}
            onMouseEnter={() => setTimeHovered(true)}
            onMouseLeave={() => setTimeHovered(false)}
            onClick={() => setTimeFullScreen(true)}
          >
            {/* Yellow corner indicator on hover */}
            {timeHovered && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '0',
                  height: '0',
                  borderBottom: '12px solid #FFDF00',
                  borderLeft: '12px solid transparent',
                  zIndex: 10,
                }}
              />
            )}
            <div
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '80px',
                fontWeight: 600,
                fontStyle: 'italic',
                color: '#FFDF00',
                textAlign: 'center',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'baseline',
                gap: '4px',
              }}
            >
              <span>{format(currentTime, 'h:mm')}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  fontStyle: 'italic',
                }}
              >
                {format(currentTime, 'a')}
              </span>
            </div>
          </div>

          {/* TO-DO LIST CARD */}
          <div className="todo-card flex flex-col flex-1" style={{ minHeight: 0 }}>
            <ToDoList />
          </div>
        </div>

        {/* MIDDLE AREA — daily card or single wide card (other views) */}
        <div 
          className="flex gap-4 flex-1 flex-col" 
          style={{ 
            minWidth: '340px',
            width: isDailyView && middleColumnWidth > 0 ? `${middleColumnWidth}px` : 'auto',
            position: 'relative', 
            height: 'calc(100vh - 32px)',
            maxHeight: 'calc(100vh - 32px)',
            overflow: 'visible', // Changed from 'hidden' to allow rounded corners to show
            marginRight: isDailyView ? 'calc(50vw + 16px)' : '0', // Make room for right panel (50vw + gap)
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          {isDailyView ? (
            <>
              {/* MIDDLE CARD — Day header + due items. Perfect square in remaining space. */}
              {!projectNotesExpanded && (
                <div
                  className="flex flex-col flex-shrink-0"
                  style={{ 
                    width: middleColumnWidth > 0 ? `${middleColumnWidth}px` : 'auto',
                    height: dailyExpanded ? 'calc(100vh - 32px)' : (middleColumnWidth > 0 ? `${middleColumnWidth}px` : 'auto'), // Perfect square: height = width
                    alignSelf: 'flex-start',
                    transition: 'height 0.3s ease-out',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2, // Increased to ensure it's above the container
                    overflow: 'hidden',
                    borderRadius: '18px 12px 12px 18px', // Left corners 18px, right corners 12px
                    background: '#FFFFFF',
                    boxShadow: '0 4px 24px rgba(0, 40, 25, 0.18)',
                  }}
                >
                  <DailyView 
                    date={selectedDate} 
                    navigate={navigate}
                    isExpanded={dailyExpanded}
                    onExpand={() => setDailyExpanded(true)}
                    onCollapse={() => setDailyExpanded(false)}
                  />
                </div>
              )}

              {/* PROJECT NOTES CARD — Below daily card, fills remaining space, or covers DailyView when expanded */}
              <div
                className="flex flex-col flex-1"
                style={{
                  width: middleColumnWidth > 0 ? `${middleColumnWidth}px` : 'auto',
                  height: projectNotesExpanded ? 'calc(100vh - 32px)' : (dailyExpanded ? 0 : 'auto'),
                  marginTop: projectNotesExpanded ? '0' : (dailyExpanded ? '0' : '16px'),
                  minHeight: 0,
                  position: 'relative',
                  zIndex: projectNotesExpanded ? 3 : 2, // Higher z-index when expanded to cover DailyView
                  overflow: 'hidden',
                  borderRadius: '18px 12px 12px 18px', // Left corners 18px, right corners 12px
                  background: '#FFFFFF',
                  boxShadow: '0 4px 24px rgba(0, 40, 25, 0.18)',
                  transition: 'height 0.3s ease-out',
                  opacity: dailyExpanded && !projectNotesExpanded ? 0 : 1,
                  pointerEvents: dailyExpanded && !projectNotesExpanded ? 'none' : 'auto',
                }}
              >
                <ProjectNotesView 
                  navigate={navigate}
                  isExpanded={projectNotesExpanded}
                  onExpand={() => setProjectNotesExpanded(true)}
                  onCollapse={() => setProjectNotesExpanded(false)}
                />
              </div>
            </>
          ) : (
            /* SINGLE WIDE CARD — hourly, monthly, or journal drill-down */
            <div className="todo-card flex flex-col flex-1" style={{ minWidth: 0 }}>
              <Navigation
                activeView={activeView}
                selectedDate={selectedDate}
                navigate={navigate}
              />
              {activeView === 'hourly' && (
                <HourlyView date={selectedDate} navigate={navigate} />
              )}
              {activeView === 'monthly' && (
                <MonthlyView selectedDate={selectedDate} navigate={navigate} />
              )}
              {activeView === 'project-notes' && (
                <ProjectNotesView navigate={navigate} />
              )}
            </div>
          )}
        </div>

        {/* RIGHT AREA — Monthly View + Upcoming Events, stacked vertically */}
        {isDailyView && (
          <div 
            className="flex flex-col gap-4 flex-shrink-0" 
            style={{ 
              position: 'absolute',
              right: '16px',
              width: 'calc(50vw - 16px)',
              minWidth: '300px',
              height: 'calc(100vh - 32px)',
              maxHeight: 'calc(100vh - 32px)',
              overflow: 'hidden',
              zIndex: 1,
            }}
          >
            {/* Monthly View — auto height, only takes space it needs */}
            <div className="todo-card flex flex-col flex-shrink-0">
              <MonthlyView selectedDate={selectedDate} navigate={navigate} />
            </div>

            {/* Upcoming Events — below monthly view, spans to bottom */}
            <div className="todo-card flex flex-col flex-1" style={{ minHeight: 0 }}>
              <UpcomingEvents navigate={navigate} />
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Time Display */}
      {timeFullScreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#006747',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fullScreenFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Full View indicator - fades in after 1 second */}
          {showFullViewText && (
            <div
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '12px',
                color: '#FFFFFF',
                animation: 'fadeIn 0.3s ease-in',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '0',
                  height: '0',
                  borderTop: '12px solid #FFDF00',
                  borderRight: '12px solid transparent',
                }}
              />
              <button
                onClick={() => setTimeFullScreen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#FFDF00',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '12px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Full View
              </button>
            </div>
          )}

          {/* Large Time Display */}
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '120px',
              fontWeight: 600,
              fontStyle: 'italic',
              color: '#FFDF00',
              textAlign: 'center',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'baseline',
              gap: '6px',
              justifyContent: 'center',
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <span>{format(currentTime, 'h:mm')}</span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 400,
                fontStyle: 'italic',
              }}
            >
              {format(currentTime, 'a')}
            </span>
          </div>

          {/* Day and Date */}
          <div
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '36px',
              fontWeight: 500,
              color: '#FFFFFF',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {format(currentTime, 'EEEE')}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '18px',
              fontWeight: 400,
              color: '#E8EFE6',
              textAlign: 'center',
              marginTop: '8px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {format(currentTime, 'MMMM d, yyyy')}
          </div>

          {/* Plant shadow SVG - full height, bottom right, part of background */}
          <img
            src="/plantshadow.svg"
            alt=""
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              height: '100vh',
              width: 'auto',
              objectFit: 'contain',
              objectPosition: 'bottom right',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}
