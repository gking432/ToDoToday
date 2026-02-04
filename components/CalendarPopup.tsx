'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, getDay } from 'date-fns'
import { formatDate } from '@/lib/utils'
import type { RecurrencePattern } from '@/types'

interface CalendarPopupProps {
  onSelectDate: (date: string | null, recurrence?: RecurrencePattern | null) => void
  onClose: () => void
  title?: string
  showNoDateOption?: boolean
  allowRecurrence?: boolean
  initialDate?: string | null
  initialRecurrence?: RecurrencePattern | null
}

export function CalendarPopup({ 
  onSelectDate, 
  onClose, 
  title = 'Select Due Date', 
  showNoDateOption = true,
  allowRecurrence = false,
  initialDate = null,
  initialRecurrence = null
}: CalendarPopupProps) {
  const [currentMonth, setCurrentMonth] = useState(initialDate ? new Date(initialDate) : new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate)
  const [showRecurrence, setShowRecurrence] = useState(allowRecurrence && !!initialRecurrence)
  const [recurrence, setRecurrence] = useState<RecurrencePattern | null>(initialRecurrence || {
    frequency: 'daily',
    interval: 1,
    endDate: null,
    endAfter: null,
    daysOfWeek: undefined,
  })
  const todayStr = formatDate(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handleDateClick = (date: Date) => {
    const dateStr = formatDate(date)
    setSelectedDate(dateStr)
    if (!allowRecurrence) {
      onSelectDate(dateStr)
      onClose()
    }
  }

  const handleConfirm = () => {
    if (selectedDate) {
      onSelectDate(selectedDate, showRecurrence ? recurrence : null)
      onClose()
    }
  }

  const popupContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        className="todo-card"
        style={{
          width: '400px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Green header */}
        <div className="card-header flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.8)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#FFFFFF')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="flex items-center justify-center transition-colors duration-150"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#006747',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,103,71,0.1)'
                e.currentTarget.style.color = '#006747'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#006747'
              }}
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>

            <h3 style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
              {format(currentMonth, 'MMMM yyyy')}
            </h3>

            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="flex items-center justify-center transition-colors duration-150"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#006747',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0,103,71,0.1)'
                e.currentTarget.style.color = '#006747'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#006747'
              }}
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mt-4" style={{ gap: '6px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '10px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  paddingBottom: '2px',
                }}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <div style={{ padding: '12px 14px' }}>
          <div className="grid grid-cols-7" style={{ gap: '6px' }}>
            {days.map((day) => {
              const dayStr = formatDate(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isToday = dayStr === todayStr

              return (
                <button
                  key={dayStr}
                  onClick={() => handleDateClick(day)}
                  className="cursor-pointer transition-all duration-150"
                  style={{
                    minHeight: '40px',
                    padding: '8px',
                    borderRadius: '10px',
                    opacity: isCurrentMonth ? 1 : 0.3,
                    backgroundColor: selectedDate === dayStr ? '#006747' : (isToday ? '#E8EFE6' : '#F5F9F7'),
                    border: selectedDate === dayStr ? '2px solid #006747' : (isToday ? '2px solid #006747' : '2px solid transparent'),
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: (selectedDate === dayStr || isToday) ? 700 : 500,
                    color: selectedDate === dayStr ? '#FFFFFF' : (isToday ? '#006747' : '#1A2E1A'),
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (isCurrentMonth && selectedDate !== dayStr) {
                      e.currentTarget.style.backgroundColor = '#E8EFE6'
                      e.currentTarget.style.borderColor = '#006747'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isCurrentMonth && selectedDate !== dayStr) {
                      e.currentTarget.style.backgroundColor = isToday ? '#E8EFE6' : '#F5F9F7'
                      e.currentTarget.style.borderColor = isToday ? '#006747' : 'transparent'
                    }
                  }}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Recurrence options — only show if allowRecurrence is true and a date is selected */}
          {allowRecurrence && selectedDate && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E8EFE6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  id="repeat"
                  checked={showRecurrence}
                  onChange={(e) => setShowRecurrence(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="repeat"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#1A2E1A',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Repeat
                </label>
              </div>

              {showRecurrence && recurrence && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Frequency */}
                  <div>
                    <label
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        color: '#5A7A5E',
                        fontWeight: 500,
                        display: 'block',
                        marginBottom: '6px',
                      }}
                    >
                      Repeat every
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        value={recurrence.interval}
                        onChange={(e) => setRecurrence({ ...recurrence, interval: parseInt(e.target.value) || 1 })}
                        style={{
                          width: '60px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E8EFE6',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '13px',
                          color: '#1A2E1A',
                          outline: 'none',
                        }}
                      />
                      <select
                        value={recurrence.frequency}
                        onChange={(e) => {
                          const freq = e.target.value as 'daily' | 'weekly' | 'monthly'
                          setRecurrence({
                            ...recurrence,
                            frequency: freq,
                            daysOfWeek: freq === 'weekly' ? [getDay(new Date(selectedDate))] : undefined,
                          })
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E8EFE6',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '13px',
                          color: '#1A2E1A',
                          outline: 'none',
                        }}
                      >
                        <option value="daily">day(s)</option>
                        <option value="weekly">week(s)</option>
                        <option value="monthly">month(s)</option>
                      </select>
                    </div>
                  </div>

                  {/* Days of week for weekly */}
                  {recurrence.frequency === 'weekly' && (
                    <div>
                      <label
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '11px',
                          color: '#5A7A5E',
                          fontWeight: 500,
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        On days
                      </label>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                          const isSelected = recurrence.daysOfWeek?.includes(index) || false
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const currentDays = recurrence.daysOfWeek || []
                                const newDays = isSelected
                                  ? currentDays.filter(d => d !== index)
                                  : [...currentDays, index].sort()
                                setRecurrence({ ...recurrence, daysOfWeek: newDays.length > 0 ? newDays : undefined })
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #E8EFE6',
                                backgroundColor: isSelected ? '#006747' : '#F5F9F7',
                                color: isSelected ? '#FFFFFF' : '#1A2E1A',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* End date */}
                  <div>
                    <label
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        color: '#5A7A5E',
                        fontWeight: 500,
                        display: 'block',
                        marginBottom: '6px',
                      }}
                    >
                      End (optional)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={recurrence.endDate ? 'date' : (recurrence.endAfter ? 'count' : 'never')}
                        onChange={(e) => {
                          if (e.target.value === 'never') {
                            setRecurrence({ ...recurrence, endDate: null, endAfter: null })
                          } else if (e.target.value === 'date') {
                            setRecurrence({ ...recurrence, endDate: formatDate(new Date()), endAfter: null })
                          } else {
                            setRecurrence({ ...recurrence, endDate: null, endAfter: 10 })
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E8EFE6',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '13px',
                          color: '#1A2E1A',
                          outline: 'none',
                        }}
                      >
                        <option value="never">Never</option>
                        <option value="date">On date</option>
                        <option value="count">After occurrences</option>
                      </select>
                      {recurrence.endDate && (
                        <input
                          type="date"
                          value={recurrence.endDate}
                          onChange={(e) => setRecurrence({ ...recurrence, endDate: e.target.value || null })}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #E8EFE6',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '13px',
                            color: '#1A2E1A',
                            outline: 'none',
                          }}
                        />
                      )}
                      {recurrence.endAfter && (
                        <input
                          type="number"
                          min="1"
                          value={recurrence.endAfter}
                          onChange={(e) => setRecurrence({ ...recurrence, endAfter: parseInt(e.target.value) || null })}
                          style={{
                            width: '80px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #E8EFE6',
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '13px',
                            color: '#1A2E1A',
                            outline: 'none',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {allowRecurrence && selectedDate ? (
              <>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #E8EFE6',
                    backgroundColor: 'transparent',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#5A7A5E',
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
                  onClick={handleConfirm}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#006747',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#FFFFFF',
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
                  Confirm
                </button>
              </>
            ) : (
              showNoDateOption && (
                <button
                  onClick={() => {
                    onSelectDate(null)
                    onClose()
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#F5F9F7',
                    border: '1px solid #E8EFE6',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '13px',
                    color: '#5A7A5E',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8EFE6'
                    e.currentTarget.style.borderColor = '#006747'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F9F7'
                    e.currentTarget.style.borderColor = '#E8EFE6'
                  }}
                >
                  No due date
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // Use portal to render at document.body level to avoid z-index stacking context issues
  if (typeof window === 'undefined') return null
  return createPortal(popupContent, document.body)
}
