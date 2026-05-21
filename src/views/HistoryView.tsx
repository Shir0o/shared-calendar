import React, { useState, useEffect } from 'react';
import type { ChangeLogEntry } from '../types';

export const HistoryView: React.FC = () => {
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  useEffect(() => {
    const fetchLogs = () => {
      const stored = localStorage.getItem('ss_changelogs');
      if (stored) {
        setLogs(JSON.parse(stored));
      } else {
        // Mock some logs if empty
        const mockLogs: ChangeLogEntry[] = [
          {
            id: 'log-1',
            eventTitle: 'WHITELIST_ADD',
            user: 'yilongwang05@gmail.com',
            action: 'WHITELIST_ADD',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            details: 'Added sarah.connor@example.com to whitelist'
          },
          {
            id: 'log-2',
            eventTitle: 'CREATE',
            user: 'yilongwang05@gmail.com',
            action: 'CREATE',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
            details: 'Created event "Q4 Planning Offsite"'
          },
          {
            id: 'log-3',
            eventTitle: 'ACCESS_REQUEST',
            user: 'jane.foster@example.com',
            action: 'ROLE_CHANGE',
            timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
            details: 'Jane Foster requested access to the calendar'
          }
        ];
        setLogs(mockLogs);
        localStorage.setItem('ss_changelogs', JSON.stringify(mockLogs));
      }
    };

    fetchLogs();
    
    // Listen for storage changes to sync instantly
    window.addEventListener('storage', fetchLogs);
    return () => window.removeEventListener('storage', fetchLogs);
  }, []);

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all history logs?')) {
      localStorage.removeItem('ss_changelogs');
      setLogs([]);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'ALL') return true;
    if (filterAction === 'EVENTS') return ['CREATE', 'UPDATE', 'DELETE'].includes(log.action);
    if (filterAction === 'SECURITY') return ['ROLE_CHANGE', 'WHITELIST_ADD', 'WHITELIST_REMOVE', 'REQUEST_APPROVE', 'REQUEST_REJECT', 'ACCESS_REQUEST'].includes(log.action);
    return true;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return 'add_circle';
      case 'UPDATE': return 'edit';
      case 'DELETE': return 'delete';
      case 'WHITELIST_ADD': return 'person_add';
      case 'WHITELIST_REMOVE': return 'person_remove';
      case 'REQUEST_APPROVE': return 'verified_user';
      case 'REQUEST_REJECT': return 'block';
      case 'ACCESS_REQUEST': return 'lock_open';
      default: return 'info';
    }
  };

  const getActionColorClasses = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'DELETE': return 'bg-red-50 text-red-750 border-red-100';
      case 'UPDATE': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'WHITELIST_ADD':
      case 'REQUEST_APPROVE': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Group by Month (e.g., "MAY '26")
  const groupLogsByMonth = (logsList: ChangeLogEntry[]) => {
    const groups: { [monthStr: string]: ChangeLogEntry[] } = {};
    logsList.forEach(log => {
      const d = new Date(log.timestamp);
      const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase().replace(' ', " '");
      if (!groups[monthStr]) {
        groups[monthStr] = [];
      }
      groups[monthStr].push(log);
    });
    return groups;
  };

  const grouped = groupLogsByMonth(filteredLogs);

  const formatLogTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };



  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">history</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Audit Audit Change History</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review workspace updates, permission changes, and access requests logs.
            </p>
          </div>
        </div>

        {/* Clear Logs */}
        {logs.length > 0 && (
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-xs font-bold text-slate-500 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">clear_all</span>
            Clear Logs
          </button>
        )}
      </header>

      {/* Sub-header Filter controls */}
      <div className="px-8 py-3 bg-white/50 backdrop-blur-sm border-b border-slate-200/40 shrink-0">
        <div className="flex gap-2 bg-slate-100 p-0.5 rounded-xl w-fit">
          {[
            { id: 'ALL', label: 'All Activities' },
            { id: 'EVENTS', label: 'Calendar Events' },
            { id: 'SECURITY', label: 'Security & Access' }
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilterAction(btn.id)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterAction === btn.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Feed Container */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-[760px] mx-auto relative pt-4">
          
          {/* Vertical timeline track line */}
          <div className="absolute left-[88px] top-0 bottom-0 w-0.5 bg-slate-200/60" />

          {Object.keys(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
              <span className="material-symbols-outlined text-slate-300 text-3xl">history_toggle_off</span>
              <p className="text-xs font-semibold text-slate-400 mt-2">No activity logs recorded</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                Perform actions on the calendar or whitelist to trigger log records.
              </p>
            </div>
          ) : (
            Object.keys(grouped).map(monthStr => (
              <div key={monthStr} className="mb-10 relative">
                
                {/* Month header badge */}
                <div className="absolute left-0 top-1 w-20 flex justify-end pr-5 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                    {monthStr}
                  </span>
                </div>

                <div className="pl-28 space-y-4">
                  {grouped[monthStr].map(log => (
                    <div
                      key={log.id}
                      className="group relative bg-white/70 hover:bg-white border border-slate-200/40 hover:border-slate-350 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 flex items-start justify-between gap-4"
                    >
                      {/* Timeline node dot indicator */}
                      <div className="absolute -left-[45px] top-6 w-3 h-3 rounded-full bg-slate-200 border-2 border-background-light group-hover:bg-primary transition-colors z-10" />

                      {/* Log details */}
                      <div className="flex gap-4 items-start min-w-0">
                        {/* Day Card */}
                        <div className="bg-slate-50 border border-slate-200/50 rounded-xl px-2.5 py-1.5 text-center min-w-[56px] shrink-0">
                          <span className="block text-sm font-bold text-slate-700 leading-none">
                            {new Date(log.timestamp).getDate()}
                          </span>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {new Date(log.timestamp).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                          </span>
                        </div>

                        {/* Description details */}
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-2 mb-1">
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${getActionColorClasses(log.action)}`}>
                              <span className="material-symbols-outlined text-[10px]">
                                {getActionIcon(log.action)}
                              </span>
                              {log.action.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              at {formatLogTime(log.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-xs font-bold text-slate-750 leading-relaxed break-words mt-1.5">
                            {log.details}
                          </p>

                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                            <span className="material-symbols-outlined text-[11px]">person</span>
                            <span>By: <span className="font-mono text-[9px]">{log.user}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
