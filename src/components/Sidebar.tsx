import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, signOut } = useAuth();
  
  if (!user) return null;
  
  const isAdmin = user.role === 'OWNER' || user.role === 'ADMIN';

  const navItems = [
    { id: 'month_view' as ActiveTab, label: 'Month Calendar', icon: 'calendar_month' },
    { id: 'list_view' as ActiveTab, label: 'Agenda List', icon: 'list_alt' },
    { id: 'team_availability' as ActiveTab, label: 'Team Availability', icon: 'group' },
    { id: 'smart_meeting_finder' as ActiveTab, label: 'Optimal Slots', icon: 'auto_awesome' },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: 'bar_chart' },
    { id: 'history' as ActiveTab, label: 'Change History', icon: 'history' },
    { id: 'design_system' as ActiveTab, label: 'Design System', icon: 'palette' },
  ];

  return (
    <aside className="w-64 bg-white/65 backdrop-blur-md border-r border-slate-200 shrink-0 flex flex-col py-6 px-4 z-10 h-full justify-between">
      <div className="flex flex-col gap-6">
        {/* Navigation Section */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
            Workspace
          </span>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    isActive
                      ? 'bg-blue-50 text-primary font-semibold shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Admin Navigation Section */}
        {isAdmin && (
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 block">
              Administration
            </span>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  activeTab === 'security'
                    ? 'bg-blue-50 text-primary font-semibold shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 font-medium'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${activeTab === 'security' ? 'text-primary' : 'text-slate-400'}`}>
                  admin_panel_settings
                </span>
                <span className="text-sm">Security & Access</span>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Footer Section with User Card */}
      <div className="pt-6 border-t border-slate-200/60 flex flex-col gap-4">
        {/* Settings button */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
            activeTab === 'settings'
              ? 'bg-blue-50 text-primary font-semibold shadow-sm'
              : 'text-slate-600 hover:bg-slate-50 font-medium'
          }`}
        >
          <span className={`material-symbols-outlined text-xl ${activeTab === 'settings' ? 'text-primary' : 'text-slate-400'}`}>
            settings
          </span>
          <span className="text-sm">Settings</span>
        </button>

        {/* User profile brief card */}
        <div className="flex items-center gap-3 px-2 py-1.5 bg-slate-50/50 rounded-2xl border border-slate-200/40">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-9 h-9 rounded-full bg-slate-100 object-cover shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{user.displayName}</p>
            <p className="text-[10px] text-slate-500 font-medium capitalize">{user.role.toLowerCase()}</p>
          </div>
          <button
            onClick={signOut}
            title="Sign Out"
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
