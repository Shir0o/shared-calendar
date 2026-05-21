import React, { useState, useEffect } from 'react';
import type { CalendarEvent } from '../types';

interface SmartMeetingFinderViewProps {
  events: CalendarEvent[];
  onSelectSlot: (start: string, end: string, attendees: string[]) => void;
}

interface TeamMemberDef {
  name: string;
  email: string;
  role: string;
  initials: string;
  avatarBg: string;
}

export const SmartMeetingFinderView: React.FC<SmartMeetingFinderViewProps> = ({
  events,
  onSelectSlot
}) => {
  const teamMembers: TeamMemberDef[] = [
    { name: 'Yilong Wang', email: 'yilongwang05@gmail.com', role: 'Product Manager', initials: 'YW', avatarBg: 'bg-orange-500' },
    { name: 'Sarah Connor', email: 'sarah.connor@example.com', role: 'Lead Engineer', initials: 'SC', avatarBg: 'bg-blue-600' },
    { name: 'John Doe', email: 'john.doe@example.com', role: 'Backend Dev', initials: 'JD', avatarBg: 'bg-emerald-600' },
    { name: 'Alex Smith', email: 'alex.smith@example.com', role: 'Security Ops', initials: 'AS', avatarBg: 'bg-purple-600' },
    { name: 'Jane Foster', email: 'jane.foster@example.com', role: 'Frontend Dev', initials: 'JF', avatarBg: 'bg-amber-600' }
  ];

  // Criteria State
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]); // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
  const [timeWindow, setTimeWindow] = useState<'any' | 'morning' | 'afternoon'>('any'); // any=9-17, morning=9-13, afternoon=13-17
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [selectedEmails, setSelectedEmails] = useState<string[]>(
    teamMembers.map(m => m.email) // select all by default
  );

  const [results, setResults] = useState<{
    dateStr: string;
    dayName: string;
    dayNum: number;
    monthName: string;
    startStr: string;
    endStr: string;
    startTimeLabel: string;
    endTimeLabel: string;
    matchScore: number;
    matchDetails: string;
    conflictMember?: string;
    conflictEventTitle?: string;
  }[]>([]);

  const handleToggleDay = (day: number) => {
    if (preferredDays.includes(day)) {
      setPreferredDays(preferredDays.filter(d => d !== day));
    } else {
      setPreferredDays([...preferredDays, day].sort());
    }
  };

  const handleToggleEmail = (email: string) => {
    if (selectedEmails.includes(email)) {
      // Must keep at least one attendee
      if (selectedEmails.length > 1) {
        setSelectedEmails(selectedEmails.filter(e => e !== email));
      }
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  // Find optimal slots algorithm
  useEffect(() => {
    // Generate potential slots for the upcoming 7 days starting tomorrow
    const foundSlots: typeof results = [];
    const tomorrow = new Date();
    
    // Scan next 7 days
    for (let dIdx = 1; dIdx <= 7; dIdx++) {
      const scanDate = new Date(tomorrow);
      scanDate.setDate(tomorrow.getDate() + dIdx);
      const dayOfWeek = scanDate.getDay(); // 0 is Sun, 6 is Sat
      
      // Skip weekends if they aren't preferred
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      
      // Check if this day of week is in preferred days
      if (!preferredDays.includes(dayOfWeek)) continue;

      const dateStr = scanDate.toISOString().split('T')[0];
      const dayNum = scanDate.getDate();
      const monthName = scanDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayName = scanDate.toLocaleDateString('en-US', { weekday: 'long' });

      // Determine hours based on time window selection
      let startHour = 9;
      let endHour = 17;
      if (timeWindow === 'morning') endHour = 13;
      if (timeWindow === 'afternoon') startHour = 13;

      // Scan every 30 minutes interval in the window
      for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
          // Calculate end time
          const startMinTotal = hour * 60 + min;
          const endMinTotal = startMinTotal + durationMinutes;
          
          const endHourReal = Math.floor(endMinTotal / 60);
          const endMinReal = endMinTotal % 60;
          
          if (endHourReal > endHour || (endHourReal === endHour && endMinReal > 0)) {
            continue; // overlaps outside of search window
          }

          const slotStartIso = `${dateStr}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
          const slotEndIso = `${dateStr}T${String(endHourReal).padStart(2, '0')}:${String(endMinReal).padStart(2, '0')}`;

          const slotStartMs = new Date(slotStartIso).getTime();
          const slotEndMs = new Date(slotEndIso).getTime();

          // Check conflicts for selected emails
          let conflictUser: string | undefined = undefined;
          let conflictTitle: string | undefined = undefined;

          for (let email of selectedEmails) {
            const userConflicts = events.filter(evt => {
              const matchesUser = evt.createdBy.toLowerCase() === email.toLowerCase() ||
                evt.attendees.some(a => a.toLowerCase() === email.toLowerCase());

              if (!matchesUser) return false;

              const evtStart = new Date(evt.start).getTime();
              const evtEnd = new Date(evt.end).getTime();

              return Math.max(evtStart, slotStartMs) < Math.min(evtEnd, slotEndMs);
            });

            if (userConflicts.length > 0) {
              conflictUser = teamMembers.find(m => m.email.toLowerCase() === email.toLowerCase())?.name || email;
              conflictTitle = userConflicts[0].title;
              break; // Stop at first conflict
            }
          }

          const startTimeLabel = new Date(slotStartIso).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          const endTimeLabel = new Date(slotEndIso).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          if (!conflictUser) {
            foundSlots.push({
              dateStr,
              dayName,
              dayNum,
              monthName,
              startStr: slotStartIso,
              endStr: slotEndIso,
              startTimeLabel,
              endTimeLabel,
              matchScore: 100,
              matchDetails: `All ${selectedEmails.length} selected members are available`
            });
          } else if (foundSlots.length < 10) { 
            // Show a few conflicts as alternative slots
            foundSlots.push({
              dateStr,
              dayName,
              dayNum,
              monthName,
              startStr: slotStartIso,
              endStr: slotEndIso,
              startTimeLabel,
              endTimeLabel,
              matchScore: 75,
              matchDetails: `${conflictUser} is in "${conflictTitle}"`,
              conflictMember: conflictUser,
              conflictEventTitle: conflictTitle
            });
          }
        }
      }
    }

    // Sort: 100% matches first, then order by date
    const sorted = foundSlots.sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore; // descending
      }
      return new Date(a.startStr).getTime() - new Date(b.startStr).getTime();
    });

    setResults(sorted.slice(0, 8)); // top 8 recommendations
  }, [preferredDays, timeWindow, durationMinutes, selectedEmails, events]);

  const handleResetCriteria = () => {
    setPreferredDays([1, 2, 3, 4, 5]);
    setTimeWindow('any');
    setDurationMinutes(60);
    setSelectedEmails(teamMembers.map(m => m.email));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex items-center justify-between border-b border-slate-200 px-8 py-4 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Optimal Meeting Slots Finder</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculates free overlaps across attendee timelines automatically.
            </p>
          </div>
        </div>
      </header>

      {/* Main Dual Pane content */}
      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Criteria */}
        <aside className="w-full lg:w-[340px] border-r border-slate-200/80 bg-white p-6 overflow-y-auto shrink-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">tune</span>
            Meeting Specifications
          </h3>

          <div className="space-y-6">
            {/* Preferred Days */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Preferred Days
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { val: 1, label: 'Mon' },
                  { val: 2, label: 'Tue' },
                  { val: 3, label: 'Wed' },
                  { val: 4, label: 'Thu' },
                  { val: 5, label: 'Fri' }
                ].map(day => {
                  const isSelected = preferredDays.includes(day.val);
                  return (
                    <button
                      key={day.val}
                      onClick={() => handleToggleDay(day.val)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-primary border-primary/30'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Window Option */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Daily Time Window
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-xl">
                {[
                  { id: 'any' as const, label: '9a - 5p' },
                  { id: 'morning' as const, label: '9a - 1p' },
                  { id: 'afternoon' as const, label: '1p - 5p' }
                ].map(w => (
                  <button
                    key={w.id}
                    onClick={() => setTimeWindow(w.id)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                      timeWindow === w.id
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Select */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Duration Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 py-2.5 text-xs text-slate-700 outline-none"
              >
                <option value={30}>30 Minutes Slot</option>
                <option value={60}>1 Hour Slot</option>
                <option value={90}>1.5 Hours Slot</option>
                <option value={120}>2 Hours Slot</option>
              </select>
            </div>

            {/* Attendees Multiselect */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Target Attendees
              </label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {teamMembers.map(member => {
                  const isChecked = selectedEmails.includes(member.email);
                  return (
                    <label
                      key={member.email}
                      className="flex items-center gap-2.5 p-2 hover:bg-slate-50 rounded-xl border border-slate-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEmail(member.email)}
                        className="text-primary focus:ring-primary rounded"
                      />
                      <div className={`w-6 h-6 rounded-lg ${member.avatarBg} text-[8px] font-bold text-white flex items-center justify-center shrink-0`}>
                        {member.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-slate-700 truncate">{member.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono truncate">{member.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Reset button */}
          <div className="mt-8 pt-4 border-t border-slate-200/50">
            <button
              onClick={handleResetCriteria}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Reset Specifications
            </button>
          </div>
        </aside>

        {/* Right Pane: Results Grid */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          <div className="max-w-[700px] mx-auto space-y-4">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Available Recommendations</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Showing top {results.length} optimal schedule recommendations.
                </p>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl text-center p-6 shadow-sm">
                <span className="material-symbols-outlined text-red-400 text-3xl">sentiment_dissatisfied</span>
                <h4 className="text-sm font-bold text-slate-800 mt-2">No overlapping slots found</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  Try relaxing the criteria, e.g. selecting fewer attendees, narrowing duration, or checking other weekdays.
                </p>
              </div>
            ) : (
              results.map((slot, index) => {
                const isConflict = slot.matchScore < 100;
                return (
                  <div
                    key={`${slot.startStr}-${index}`}
                    className={`glass-panel border rounded-2xl p-5 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                      isConflict
                        ? 'border-amber-250 bg-amber-50/15'
                        : 'border-blue-200 bg-blue-50/5'
                    }`}
                  >
                    {/* Date/Time badge */}
                    <div className="flex items-start gap-4 flex-grow min-w-0">
                      {/* Calendar page stamp */}
                      <div className="w-10 h-11 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden shrink-0 text-center">
                        <span className="bg-red-500 text-white text-[8px] font-bold py-0.5 uppercase block tracking-wider leading-none">
                          {slot.monthName}
                        </span>
                        <span className="text-slate-800 text-sm font-bold block mt-0.5 leading-tight">
                          {slot.dayNum}
                        </span>
                      </div>

                      {/* Text descriptors */}
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 leading-tight">
                          {slot.dayName}, {slot.startTimeLabel} - {slot.endTimeLabel}
                        </h4>
                        
                        <div className="flex items-center flex-wrap gap-2 mt-1.5">
                          {isConflict ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-[9px] font-bold text-amber-700 border border-amber-200">
                              <span className="material-symbols-outlined text-[11px] font-bold fill-1">warning</span>
                              Conflict Detected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                              <span className="material-symbols-outlined text-[11px] font-bold fill-1">check_circle</span>
                              100% Match
                            </span>
                          )}

                          <span className={`text-[10px] ${isConflict ? 'text-amber-800' : 'text-slate-500'} font-medium`}>
                            {slot.matchDetails}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Book slot action */}
                    <button
                      onClick={() => onSelectSlot(slot.startStr, slot.endStr, selectedEmails)}
                      className={`w-full sm:w-auto px-4 py-2.5 font-bold rounded-xl text-xs shadow-sm transition-all active:scale-[0.97] flex-shrink-0 cursor-pointer ${
                        isConflict
                          ? 'border border-primary text-primary hover:bg-blue-50/50 bg-white'
                          : 'bg-primary hover:bg-blue-600 text-white'
                      }`}
                    >
                      Book Slot
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
