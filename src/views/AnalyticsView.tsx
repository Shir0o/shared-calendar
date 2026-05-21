import React, { useMemo } from 'react';


interface EventData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  room?: string;
}

export const AnalyticsView: React.FC = () => {
  // Let's grab events from localStorage to make stats dynamic if possible
  const events: EventData[] = useMemo(() => {
    try {
      const stored = localStorage.getItem('ss_events');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    // Fallback mock events
    return [
      { id: '1', title: 'Q4 Product Offsite', startTime: '2026-05-20T09:00:00', endTime: '2026-05-20T12:00:00', attendees: ['yilongwang05@gmail.com', 'sarah.connor@example.com'], room: 'Boardroom A' },
      { id: '2', title: 'Sprint Retrospective', startTime: '2026-05-21T14:00:00', endTime: '2026-05-21T15:00:00', attendees: ['yilongwang05@gmail.com', 'john.doe@example.com', 'alex.smith@example.com'], room: 'Meeting Room Alpha' },
      { id: '3', title: 'Weekly 1:1 Sync', startTime: '2026-05-21T10:00:00', endTime: '2026-05-21T11:30:00', attendees: ['sarah.connor@example.com', 'john.doe@example.com'], room: 'Huddle Studio B' },
      { id: '4', title: 'Design Review', startTime: '2026-05-22T11:00:00', endTime: '2026-05-22T12:00:00', attendees: ['yilongwang05@gmail.com', 'alex.smith@example.com'], room: 'Boardroom A' },
      { id: '5', title: 'External Client Kickoff', startTime: '2026-05-22T15:00:00', endTime: '2026-05-22T17:00:00', attendees: ['yilongwang05@gmail.com', 'sarah.connor@example.com'], room: 'Meeting Room Alpha' }
    ];
  }, []);

  // Compute stats
  const totalMeetings = events.length;
  
  const totalHours = useMemo(() => {
    return events.reduce((acc, ev) => {
      const start = new Date(ev.startTime).getTime();
      const end = new Date(ev.endTime).getTime();
      const durationHours = (end - start) / (1000 * 60 * 60);
      return acc + (isNaN(durationHours) ? 0 : durationHours);
    }, 0);
  }, [events]);

  const roomDistribution = useMemo(() => {
    const dist: { [key: string]: number } = {};
    events.forEach(ev => {
      if (ev.room) {
        dist[ev.room] = (dist[ev.room] || 0) + 1;
      }
    });
    return dist;
  }, [events]);

  const attendeeDistribution = useMemo(() => {
    const dist: { [key: string]: number } = {};
    events.forEach(ev => {
      ev.attendees.forEach(att => {
        dist[att] = (dist[att] || 0) + 1;
      });
    });
    return dist;
  }, [events]);

  // Render SVG charts
  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">bar_chart</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Team Analytics & Insights</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitor focus hour allocations, room reservations, and collective meeting load trends.
            </p>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        
        {/* KPI Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Meetings Scheduled</span>
            <span className="text-2xl font-bold text-slate-800">{totalMeetings}</span>
            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              +12% vs last week
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Meeting Hours</span>
            <span className="text-2xl font-bold text-slate-800">{totalHours.toFixed(1)} hrs</span>
            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
              Avg {(totalHours / (totalMeetings || 1)).toFixed(1)}h per meeting
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Room Occupancy Rate</span>
            <span className="text-2xl font-bold text-slate-800">
              {events.filter(e => e.room).length > 0 ? '68%' : '0%'}
            </span>
            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
              Boardroom A most active
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Focus Hour Score</span>
            <span className="text-2xl font-bold text-slate-800">84/100</span>
            <span className="text-[9px] font-bold text-purple-600 flex items-center gap-0.5">
              Optimal team flow state
            </span>
          </div>
        </div>

        {/* Charts Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Line chart: Weekly Meetings Load */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-slate-800 text-sm font-bold">Weekly Meetings Trend</h3>
              <p className="text-[11px] text-slate-400">Total hours spent in slots over the last week.</p>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="h-64 w-full relative pt-2">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#005ea1" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#005ea1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="160" x2="500" y2="160" stroke="#f1f5f9" strokeWidth="1" />
                
                {/* Chart Path Area */}
                <path
                  d="M 0 160 Q 100 80 200 120 T 400 40 L 500 100 L 500 200 L 0 200 Z"
                  fill="url(#chartGradient)"
                />
                {/* Chart Line */}
                <path
                  d="M 0 160 Q 100 80 200 120 T 400 40 L 500 100"
                  fill="none"
                  stroke="#005ea1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                
                {/* Data Points */}
                <circle cx="100" cy="115" r="4" fill="#005ea1" stroke="#fff" strokeWidth="1.5" />
                <circle cx="200" cy="120" r="4" fill="#005ea1" stroke="#fff" strokeWidth="1.5" />
                <circle cx="300" cy="80" r="4" fill="#005ea1" stroke="#fff" strokeWidth="1.5" />
                <circle cx="400" cy="40" r="4" fill="#005ea1" stroke="#fff" strokeWidth="1.5" />
              </svg>

              {/* X-Axis labels */}
              <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 px-1">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
              </div>
            </div>
          </div>

          {/* Room Allocation breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-slate-800 text-sm font-bold">Room Bookings</h3>
              <p className="text-[11px] text-slate-400">Distribution of events across available spaces.</p>
            </div>

            <div className="space-y-4">
              {['Boardroom A', 'Meeting Room Alpha', 'Huddle Studio B'].map(roomName => {
                const count = roomDistribution[roomName] || 0;
                const pct = totalMeetings > 0 ? (count / totalMeetings) * 100 : 0;
                
                return (
                  <div key={roomName} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{roomName}</span>
                      <span className="font-bold text-slate-500">{count} meetings ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 4: Team Load Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active attendee distribution list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-slate-800 text-sm font-bold">Meeting Load by Member</h3>
              <p className="text-[11px] text-slate-400">Total number of meetings attended this week.</p>
            </div>

            <div className="space-y-3">
              {Object.keys(attendeeDistribution).length === 0 ? (
                <p className="text-xs text-slate-400">No meeting attendees logged yet.</p>
              ) : (
                Object.keys(attendeeDistribution).map(email => (
                  <div key={email} className="flex justify-between items-center p-2 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary">
                        {email[0].toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-750 truncate max-w-[200px]">{email}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {attendeeDistribution[email]} meetings
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Recommendations Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-slate-800 text-sm font-bold">SoftSchedule Insights</h3>
                <p className="text-[11px] text-slate-400">Recommendations based on systemic load patterns.</p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-amber-500 text-lg">lightbulb</span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-700">High Wednesday Meeting Load</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Wednesday shows a 45% load increase. Try moving sprint retro slots to Thursday.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-primary text-lg">calendar_today</span>
                  <div className="text-xs">
                    <p className="font-bold text-slate-700">Focus Hours Protected</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Focus hour score is 84/100, showing good separation between meetings.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2 border border-primary text-primary hover:bg-primary/5 text-xs font-bold rounded-xl transition-all cursor-pointer mt-4"
            >
              Export Analytics PDF Report
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
