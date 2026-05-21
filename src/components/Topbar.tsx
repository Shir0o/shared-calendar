import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { ActiveTab } from '../types';

interface TopbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onCreateEventClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ activeTab, setActiveTab, onCreateEventClick }) => {
  const { user } = useAuth();

  if (!user) return null;

  const handleTabToggle = (mode: 'month' | 'list') => {
    if (mode === 'month') {
      setActiveTab('month_view');
    } else {
      setActiveTab('list_view');
    }
  };

  const isCalendarView = activeTab === 'month_view' || activeTab === 'list_view';

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shrink-0 z-20 h-16">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined text-xl">event_available</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">SoftSchedule</h1>
        </div>

        {/* Top bar View mode toggle */}
        {isCalendarView && (
          <div className="bg-slate-100 p-0.5 rounded-xl hidden md:flex items-center">
            <button
              onClick={() => handleTabToggle('month')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold leading-normal transition-all ${
                activeTab === 'month_view'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => handleTabToggle('list')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold leading-normal transition-all ${
                activeTab === 'list_view'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              List
            </button>
          </div>
        )}
      </div>

      {/* Action buttons & Profile avatar */}
      <div className="flex items-center gap-4">
        {/* Create Event Trigger */}
        <button
          onClick={onCreateEventClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create Event
        </button>

        {/* User avatar and email indicator */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-8 h-8 rounded-full bg-slate-100 object-cover shadow-inner"
          />
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800 leading-none">{user.displayName}</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">{user.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
