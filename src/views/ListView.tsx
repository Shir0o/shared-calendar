import React, { useState } from 'react';
import type { CalendarEvent } from '../types';

interface ListViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddEventClick: () => void;
}

export const ListView: React.FC<ListViewProps> = ({
  events,
  onEventClick,
  onAddEventClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Sort events by start date/time
  const sortedEvents = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Filter events by search query
  const filteredEvents = sortedEvents.filter(event => {
    const query = searchQuery.toLowerCase();
    return (
      event.title.toLowerCase().includes(query) ||
      (event.description && event.description.toLowerCase().includes(query)) ||
      (event.room && event.room.toLowerCase().includes(query)) ||
      event.attendees.some(email => email.toLowerCase().includes(query))
    );
  });

  // Group events by date (YYYY-MM-DD)
  const groupedEvents: { [dateStr: string]: CalendarEvent[] } = {};
  filteredEvents.forEach(event => {
    const dateStr = event.start.split('T')[0];
    if (!groupedEvents[dateStr]) {
      groupedEvents[dateStr] = [];
    }
    groupedEvents[dateStr].push(event);
  });

  // Formatter for date section headers
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Check if tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let prefix = '';
    if (dateStr === todayStr) {
      prefix = 'Today, ';
    } else if (dateStr === tomorrowStr) {
      prefix = 'Tomorrow, ';
    }

    return prefix + date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header with Search and Stats */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">list_alt</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Agenda Agenda List</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredEvents.length} events scheduled in total
            </p>
          </div>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          {/* Search bar */}
          <div className="flex items-center bg-slate-50 border border-slate-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary rounded-xl px-3 py-1.5 w-full md:w-64 transition-all">
            <span className="material-symbols-outlined text-slate-400 text-lg mr-2 select-none">search</span>
            <input
              type="text"
              placeholder="Search title, room, attendee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none w-full border-none p-0 focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Agenda List View Content */}
      <div className="flex-grow overflow-y-auto px-8 py-6">
        <div className="max-w-[760px] mx-auto space-y-8">
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <span className="material-symbols-outlined text-3xl">search_off</span>
              </div>
              <h3 className="text-base font-bold text-slate-800">No events matched query</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                Try searching for a different keyword or create a new event for this workspace.
              </p>
              <button
                onClick={onAddEventClick}
                className="mt-4 px-4 py-2 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl text-xs shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span> Create New Event
              </button>
            </div>
          ) : (
            Object.keys(groupedEvents).map(dateStr => (
              <section key={dateStr} className="relative">
                {/* Date header */}
                <div className="sticky top-0 bg-background-light/95 backdrop-blur-sm z-10 py-2.5 mb-3 border-b border-slate-200/40">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {formatDateHeader(dateStr)}
                  </h3>
                </div>

                {/* Date events cards stack */}
                <div className="space-y-3">
                  {groupedEvents[dateStr].map(event => {
                    const isPrivate = event.visibility === 'PRIVATE';
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        style={{ borderLeftColor: event.color || '#2b93ee' }}
                        className="group flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/70 hover:bg-white border border-slate-200/50 hover:border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-l-4 gap-4"
                      >
                        {/* Event details */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          {/* Timing column */}
                          <div className="shrink-0 text-left pt-0.5 min-w-[75px]">
                            <p className="text-xs font-bold text-slate-700">{formatTime(event.start)}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60000)} mins
                            </p>
                          </div>

                          {/* Text info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                                {event.title}
                              </h4>
                              {isPrivate && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 text-[9px] font-bold text-red-500 border border-red-100">
                                  <span className="material-symbols-outlined text-[10px]">lock</span>
                                  Private
                                </span>
                              )}
                              <span className="text-[9px] px-2 py-0.5 bg-slate-100 border border-slate-200/60 rounded-full font-bold text-slate-500 capitalize">
                                {event.type}
                              </span>
                            </div>
                            
                            {/* description or room */}
                            {event.description && (
                              <p className="text-xs text-slate-500 truncate mt-1">
                                {event.description}
                              </p>
                            )}
                            
                            {event.room && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1.5">
                                <span className="material-symbols-outlined text-xs">meeting_room</span>
                                <span className="font-semibold text-slate-500">{event.room}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Attendees Avatars list */}
                        <div className="flex items-center justify-end shrink-0 pl-0 md:pl-4">
                          {event.attendees && event.attendees.length > 0 ? (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {event.attendees.slice(0, 3).map((email) => (
                                <div
                                  key={email}
                                  className="w-7 h-7 rounded-full bg-slate-150 border-2 border-white text-[9px] font-bold text-slate-600 flex items-center justify-center shadow-sm"
                                  title={email}
                                >
                                  {email[0].toUpperCase()}
                                </div>
                              ))}
                              {event.attendees.length > 3 && (
                                <div className="w-7 h-7 rounded-full bg-primary border-2 border-white text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
                                  +{event.attendees.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No invitees</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
