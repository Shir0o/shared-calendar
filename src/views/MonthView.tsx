import React, { useState } from 'react';
import type { CalendarEvent } from '../types';

interface MonthViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onDateClick: (dateStr: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  events,
  currentDate,
  setCurrentDate,
  onDateClick,
  onEventClick
}) => {
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to construct calendar days
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);
  const startDayOfWeek = startOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = endOfMonth.getDate();
  const prevMonthEnd = new Date(year, month, 0).getDate();

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevYear = month === 0 ? year - 1 : year;
    const prevMonth = month === 0 ? 11 : month - 1;
    const day = prevMonthEnd - i;
    days.push({
      dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      dayNum: day,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: true
    });
  }

  // Next month padding to fill grid
  const totalCells = days.length > 35 ? 42 : 35;
  const nextMonthDaysToAdd = totalCells - days.length;
  for (let i = 1; i <= nextMonthDaysToAdd; i++) {
    const nextYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 0 : month + 1;
    days.push({
      dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: false
    });
  }

  // Change month handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get events on a specific date (dateStr: YYYY-MM-DD)
  const getEventsForDate = (dateStr: string) => {
    return events.filter(event => event.start.startsWith(dateStr));
  };

  // Format date helper for agenda
  const formatAgendaDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const selectedDateEvents = getEventsForDate(selectedDateStr);

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* Left Pane: Calendar Grid */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Sub-header: Date navigation */}
        <header className="flex items-center justify-between border-b border-slate-200 px-8 py-3 bg-white shrink-0 z-10 h-14">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">
              {monthNames[month]} {year}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next Month"
            >
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </header>

        {/* Calendar Grid Area */}
        <div className="flex-1 flex flex-col p-6 min-h-0 overflow-hidden bg-background-light">
          {/* Days of Week Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 shrink-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="flex-1 grid grid-cols-7 gap-1 bg-slate-200/50 rounded-2xl overflow-hidden p-1 shadow-inner border border-slate-200/40">
            {days.map((day, idx) => {
              const dayEvents = getEventsForDate(day.dateStr);
              const isToday = day.dateStr === new Date().toISOString().split('T')[0];
              const isSelected = day.dateStr === selectedDateStr;

              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  onDoubleClick={() => onDateClick(day.dateStr)}
                  className={`p-1.5 flex flex-col gap-1 rounded-xl transition-all relative group cursor-pointer ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 opacity-60'
                  } ${
                    isSelected ? 'ring-2 ring-primary bg-blue-50/20' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Date Number Label */}
                  <div className="flex justify-between items-center shrink-0">
                    {/* Add event quick indicator */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDateClick(day.dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-primary hover:text-blue-700 font-bold flex items-center gap-0.5 p-0.5 rounded transition-opacity"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                    </button>

                    <div
                      className={`flex items-center justify-center text-xs font-bold ${
                        isToday
                          ? 'w-6 h-6 rounded-full bg-primary text-white shadow-sm'
                          : isSelected
                          ? 'text-primary'
                          : day.isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.dayNum}
                    </div>
                  </div>

                  {/* Day Events Container */}
                  <div className="flex-grow overflow-y-auto space-y-1 pr-0.5 max-h-[80px]">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        style={{ borderLeftColor: event.color || '#2b93ee' }}
                        className="event-pill text-[10px] font-semibold truncate px-2 py-1 rounded bg-slate-50 border border-slate-200/60 border-l-4 text-slate-700 shadow-sm leading-tight flex items-center justify-between"
                      >
                        <span className="truncate">{event.title}</span>
                        {event.visibility === 'PRIVATE' && (
                          <span className="material-symbols-outlined text-[10px] text-red-500 ml-1">lock</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Right Pane: Glass Sidebar Agenda */}
      <aside className="w-[320px] h-full shrink-0 glass-panel border-l border-slate-200/80 shadow-[-4px_0_24px_rgba(0,0,0,0.02)] flex flex-col z-10 relative">
        <div className="px-6 py-6 border-b border-slate-200/50 shrink-0">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Day Agenda</h3>
          <p className="text-xs text-slate-500 mt-1">{formatAgendaDate(selectedDateStr)}</p>
        </div>

        {/* Selected Date Agenda Events */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {selectedDateEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <span className="material-symbols-outlined text-slate-300 text-3xl">event_busy</span>
              <p className="text-xs font-semibold text-slate-400 mt-2">No scheduled events</p>
              <button
                onClick={() => onDateClick(selectedDateStr)}
                className="mt-3 text-xs text-primary hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span> Add an event
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map(event => {
                const startTime = new Date(event.start).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left flex items-start gap-3 p-3 bg-white/70 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl shadow-sm transition-all group cursor-pointer"
                  >
                    <div
                      className="w-1.5 h-10 rounded shrink-0"
                      style={{ backgroundColor: event.color || '#2b93ee' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400 group-hover:text-primary transition-colors">
                          {startTime}
                        </span>
                        {event.visibility === 'PRIVATE' && (
                          <span className="material-symbols-outlined text-xs text-red-500">lock</span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                        {event.title}
                      </div>
                      {event.room && (
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[10px]">meeting_room</span>
                          <span className="truncate">{event.room}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Area with Create Quick Shortcut */}
        <div className="p-4 shrink-0 border-t border-slate-200/50 bg-white/30 backdrop-blur-md">
          <button
            onClick={() => onDateClick(selectedDateStr)}
            className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl bg-primary hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add Event for this Day
          </button>
        </div>
      </aside>
    </div>
  );
};
