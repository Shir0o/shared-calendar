import React, { useState } from 'react';
import type { CalendarEvent } from '../types';

interface TeamAvailabilityViewProps {
  events: CalendarEvent[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

interface TeamMemberDef {
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarSeed: string;
  avatarBg: string;
}

export const TeamAvailabilityView: React.FC<TeamAvailabilityViewProps> = ({
  events,
  currentDate,
  setCurrentDate
}) => {
  const [filterDepartment, setFilterDepartment] = useState<'All' | 'Product' | 'Engineering' | 'Design'>('All');

  const teamMembers: TeamMemberDef[] = [
    { name: 'Yilong Wang', email: 'yilongwang05@gmail.com', role: 'Product Manager', initials: 'YW', avatarSeed: 'Yilong', avatarBg: 'bg-orange-500' },
    { name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'Lead Engineer', initials: 'SC', avatarSeed: 'Sarah', avatarBg: 'bg-blue-600' },
    { name: 'John Doe', email: 'john.doe@example.com', role: 'Backend Dev', initials: 'JD', avatarSeed: 'John', avatarBg: 'bg-emerald-600' },
    { name: 'Alex Smith', email: 'alex.smith@example.com', role: 'Security Ops', initials: 'AS', avatarSeed: 'Alex', avatarBg: 'bg-purple-600' },
    { name: 'Jane Foster', email: 'jane.foster@example.com', role: 'Frontend Dev', initials: 'JF', avatarSeed: 'Jane', avatarBg: 'bg-amber-600' },
  ];

  // Filter members by role or department (demo filter)
  const filteredMembers = teamMembers.filter(member => {
    if (filterDepartment === 'All') return true;
    if (filterDepartment === 'Product') return member.role.includes('Product');
    if (filterDepartment === 'Engineering') return member.role.includes('Dev') || member.role.includes('Lead');
    if (filterDepartment === 'Design') return member.role.includes('Design') || member.role.includes('UX');
    return true;
  });

  // Get Monday of the week for currentDate
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  const monday = getMonday(currentDate);

  // Generate 5 week days (Mon-Fri)
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // Slots in a day
  const slots = [
    { label: '9a', startHour: 9, endHour: 11 },
    { label: '11a', startHour: 11, endHour: 13 },
    { label: '1p', startHour: 13, endHour: 15 },
    { label: '3p', startHour: 15, endHour: 17 },
    { label: '5p', startHour: 17, endHour: 19 }
  ];

  // Calculate busy level (0, 25, 50, 75, 100) for a member in a slot on a day
  const getBusyLevel = (memberEmail: string, day: Date, startH: number, endH: number) => {
    const dayStr = day.toISOString().split('T')[0];
    
    // Find events for this member on this day that overlap this slot
    const slotStart = new Date(`${dayStr}T${String(startH).padStart(2, '0')}:00:00`).getTime();
    const slotEnd = new Date(`${dayStr}T${String(endH).padStart(2, '0')}:00:00`).getTime();

    const matchingEvents = events.filter(event => {
      // Must be creator or attendee
      const isParticipant =
        event.createdBy.toLowerCase() === memberEmail.toLowerCase() ||
        event.attendees.some(e => e.toLowerCase() === memberEmail.toLowerCase());
      
      if (!isParticipant) return false;

      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();

      // Check overlap
      return Math.max(eventStart, slotStart) < Math.min(eventEnd, slotEnd);
    });

    if (matchingEvents.length === 0) return 0;

    // Check event types to determine busy weight
    let maxWeight = 0;
    matchingEvents.forEach(evt => {
      let weight = 25;
      if (evt.type === 'meeting') weight = 100;
      else if (evt.type === 'personal') weight = 75;
      else if (evt.type === 'offsite') weight = 50;
      else if (evt.type === 'work') weight = 25;
      
      if (weight > maxWeight) maxWeight = weight;
    });

    return maxWeight as 0 | 25 | 50 | 75 | 100;
  };

  const navigateWeek = (weeksDiff: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + weeksDiff * 7);
    setCurrentDate(newDate);
  };

  // Format week range text
  const formatWeekRange = () => {
    const lastDay = new Date(monday);
    lastDay.setDate(monday.getDate() + 4);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `Week of ${monday.toLocaleDateString('en-US', options)} - ${lastDay.toLocaleDateString('en-US', options)}`;
  };

  const getHeatClass = (level: number) => {
    switch (level) {
      case 25: return 'bg-blue-500/20 hover:bg-blue-500/35 border-blue-200/30';
      case 50: return 'bg-blue-500/40 hover:bg-blue-500/55 border-blue-300/40';
      case 75: return 'bg-blue-500/70 hover:bg-blue-500/80 border-blue-400/50';
      case 100: return 'bg-primary hover:bg-blue-700 border-blue-500/50';
      default: return 'bg-white hover:bg-slate-50 border-slate-200/40';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">groups</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Team Availability Timeline</h2>
            <p className="text-xs text-slate-500 mt-0.5">{formatWeekRange()}</p>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Previous Week"
          >
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            This Week
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Next Week"
          >
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
      </header>

      {/* Sub-header Controls: Filter & Legend */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-3 bg-white/50 backdrop-blur-sm border-b border-slate-200/40 gap-4 shrink-0">
        {/* Department Filter Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl">
          {(['All', 'Product', 'Engineering'] as const).map(dept => (
            <button
              key={dept}
              onClick={() => setFilterDepartment(dept)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterDepartment === dept
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border border-slate-200/60 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Load:</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded bg-white border border-slate-250" title="Free" />
            <span className="text-[10px] text-slate-500 font-medium">Free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded bg-blue-500/20 border border-blue-200/40" title="Light" />
            <span className="text-[10px] text-slate-500 font-medium">25%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded bg-blue-500/40 border border-blue-300/40" title="Moderate" />
            <span className="text-[10px] text-slate-500 font-medium">50%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded bg-blue-500/70 border border-blue-400/40" title="Heavy" />
            <span className="text-[10px] text-slate-500 font-medium">75%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-3.5 rounded bg-primary" title="Busy" />
            <span className="text-[10px] text-slate-500 font-medium">100%</span>
          </div>
        </div>
      </div>

      {/* Main Heatmap Container Area */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Scrollable grid frame */}
          <div className="flex-1 overflow-auto">
            {/* Heatmap Grid (Width matches 200px + 25 columns * 36px min) */}
            <div className="grid grid-cols-[200px_repeat(25,_minmax(42px,_1fr))] gap-px bg-slate-200 min-w-[1250px]">
              
              {/* Row 1: Header - Days (each spans 5 columns) */}
              <div className="bg-slate-50/80 sticky top-0 left-0 z-30 border-b border-slate-300 flex items-center px-4 font-bold text-xs text-slate-500 h-10 shadow-[1px_0_0_#cbd5e1]">
                Team Member
              </div>
              {weekDays.map((day, idx) => (
                <div
                  key={`day-hdr-${idx}`}
                  className="col-span-5 bg-slate-50/80 sticky top-0 z-20 border-b border-slate-300 font-bold text-xs text-slate-700 text-center py-2 h-10 flex items-center justify-center border-l border-slate-200"
                >
                  {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              ))}

              {/* Row 2: Header - Time slots */}
              <div className="bg-slate-50/50 sticky top-10 left-0 z-30 border-b border-slate-300 flex items-center justify-between px-4 font-bold text-[10px] text-slate-400 h-8 shadow-[1px_0_0_#cbd5e1] uppercase tracking-wider">
                <span>Role Scope</span>
                <span className="material-symbols-outlined text-xs">unfold_more</span>
              </div>
              {weekDays.map((_, dayIdx) =>
                slots.map((slot, slotIdx) => (
                  <div
                    key={`slot-hdr-${dayIdx}-${slotIdx}`}
                    className="bg-slate-50/50 sticky top-10 z-10 border-b border-slate-300 text-[10px] font-bold text-slate-400 text-center py-1.5 h-8 flex items-center justify-center border-l border-slate-200/50"
                  >
                    {slot.label}
                  </div>
                ))
              )}

              {/* Data Rows: Team members and availability blocks */}
              {filteredMembers.map((member) => (
                <React.Fragment key={member.email}>
                  {/* Left Column: Member Card */}
                  <div className="bg-white sticky left-0 z-20 px-4 py-3 flex items-center gap-3 border-b border-slate-200 shadow-[1px_0_0_#e2e8f0]">
                    <div className={`w-8 h-8 rounded-xl ${member.avatarBg} text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm`}>
                      {member.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{member.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">
                        {member.role}
                      </p>
                    </div>
                  </div>

                  {/* 25 heat cells */}
                  {weekDays.map((day) =>
                    slots.map((slot) => {
                      const busyLevel = getBusyLevel(member.email, day, slot.startHour, slot.endHour);
                      const heatClass = getHeatClass(busyLevel);
                      
                      return (
                        <div
                          key={`cell-${member.email}-${day.toISOString()}-${slot.label}`}
                          className={`border-b border-l border-slate-200/80 h-14 transition-all duration-200 flex flex-col items-center justify-center ${heatClass}`}
                          title={`${member.name}: ${busyLevel}% Busy at ${slot.label} (${slot.startHour}:00 - ${slot.endHour}:00)`}
                        >
                          {busyLevel > 0 && (
                            <span className={`text-[9px] font-bold px-1 rounded ${
                              busyLevel === 100 ? 'text-white' : 'text-slate-600 bg-white/40 border border-slate-300/30'
                            }`}>
                              {busyLevel}%
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </React.Fragment>
              ))}

            </div>
          </div>

          {/* Footer controls */}
          <footer className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="text-[10px] text-slate-400 font-medium">
              * Click cell to inspect team member assignments in general calendar
            </div>
            <button
              onClick={() => window.print()}
              className="text-primary hover:text-blue-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Print Availability Report
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};
