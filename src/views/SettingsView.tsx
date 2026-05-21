import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  
  // Profile settings
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email] = useState(user?.email || '');
  
  // App preferences
  const [theme, setTheme] = useState('light');
  const [defaultView, setDefaultView] = useState('month');
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  
  // Notifications
  const [notifyOnInvites, setNotifyOnInvites] = useState(true);
  const [notifyOnCancel, setNotifyOnCancel] = useState(true);
  const [notifyDailySummary, setNotifyDailySummary] = useState(false);

  // Status message
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving changes...');
    
    setTimeout(() => {
      // For demo, we can save user custom displayName back into localStorage user
      if (user) {
        const updatedUser = { ...user, displayName };
        localStorage.setItem('ss_current_user', JSON.stringify(updatedUser));
        // Note: Full integration would call context to sync state.
      }
      setSaveStatus('Settings successfully saved!');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">settings</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Account & Application Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize your profile, configure default calendar behaviors, and set email/browser notification rules.
            </p>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <form onSubmit={handleSaveSettings} className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-w-4xl">
        {saveStatus && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-100 animate-fade-in">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{saveStatus}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nav sidebar link shortcuts on Left */}
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
              <button type="button" className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person</span>
                Profile Settings
              </button>
              <button type="button" className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Calendar Preferences
              </button>
              <button type="button" className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-sm">notifications</span>
                Notifications
              </button>
              <button type="button" className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer">
                <span className="material-symbols-outlined text-sm">link</span>
                Connected Integrations
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-center">
              <img
                src={user?.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.displayName}`}
                alt="Profile Avatar"
                className="w-16 h-16 rounded-full mx-auto border border-slate-200 shadow-inner mb-2"
              />
              <p className="text-xs font-bold text-slate-800">{user?.displayName}</p>
              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{user?.email}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-250/30 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                Role: {user?.role}
              </span>
            </div>
          </div>

          {/* Right Side Settings Panel Area */}
          <div className="md:col-span-2 space-y-6">
            {/* Profile Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Google Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Calendar Preferences Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Calendar Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Default View</label>
                  <select
                    value={defaultView}
                    onChange={(e) => setDefaultView(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="month">Month Grid View</option>
                    <option value="list">Agenda List View</option>
                    <option value="availability">Team Availability Timeline</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visual Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary bg-white"
                  >
                    <option value="light">Soft Systemic Light (Recommended)</option>
                    <option value="dark">Classic Dark Mode</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Hours Start</label>
                  <input
                    type="time"
                    value={workingHoursStart}
                    onChange={(e) => setWorkingHoursStart(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Work Hours End</label>
                  <input
                    type="time"
                    value={workingHoursEnd}
                    onChange={(e) => setWorkingHoursEnd(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Notification Rules */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Notification Rules</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnInvites}
                    onChange={(e) => setNotifyOnInvites(e.target.checked)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Email invite invitations</span>
                    <span className="text-[10px] text-slate-400">Receive alert when invited to meeting slots.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyOnCancel}
                    onChange={(e) => setNotifyOnCancel(e.target.checked)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Meeting cancellations & edits</span>
                    <span className="text-[10px] text-slate-400">Receive alert when scheduled slots are changed.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyDailySummary}
                    onChange={(e) => setNotifyDailySummary(e.target.checked)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Daily morning briefings</span>
                    <span className="text-[10px] text-slate-400">Receive a consolidated agenda digest email at 8:00 AM daily.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex justify-end gap-3 pb-6">
              <button
                type="button"
                className="px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Reset Default
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
