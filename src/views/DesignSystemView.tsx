import React from 'react';

export const DesignSystemView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">palette</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Soft Systemic Design Tokens</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review colors, font treatments, UI containers, buttons, and state indicators used in SoftSchedule.
            </p>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
        
        {/* Row 1: Typography & Color Palettes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Typography Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Outfit Typography</h3>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Display Header - 20px (Tracking tight)</span>
                <span className="text-[20px] font-bold text-slate-900 tracking-tight">Soft Systemic Team Calendar</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Section Title - 14px (Font bold)</span>
                <span className="text-sm font-bold text-slate-800">Approved Team Whitelist</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Body Text - 12px (Regular slate-650)</span>
                <p className="text-xs text-slate-650 leading-relaxed">
                  Only whitelisted email addresses will be allowed to log in. Non-approved emails see access pending.
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">System Label - 10px (All caps, Tracking wider)</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Protocol</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1">Monospace Data - 10px (Font mono)</span>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                  yilongwang05@gmail.com
                </span>
              </div>
            </div>
          </div>

          {/* Color Palettes Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Visual Palette</h3>
            
            <div className="space-y-3">
              <span className="text-[10px] text-slate-400 font-bold block">Brand colors</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-primary text-white p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Primary</span>
                  <span className="text-[9px] font-mono opacity-80">#005ea1</span>
                </div>
                <div className="bg-primary-container text-white p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Primary Container</span>
                  <span className="text-[9px] font-mono opacity-80">#0078ca</span>
                </div>
                <div className="bg-secondary text-white p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Secondary</span>
                  <span className="text-[9px] font-mono opacity-80">#436083</span>
                </div>
                <div className="bg-background-light border border-slate-200 text-slate-700 p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">BG Light</span>
                  <span className="text-[9px] font-mono opacity-80">#f6f7f8</span>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 font-bold block pt-2">System and Status colors</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Success</span>
                  <span className="text-[9px] font-mono opacity-80">#10b981</span>
                </div>
                <div className="bg-amber-50 text-amber-800 border border-amber-100 p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Warning</span>
                  <span className="text-[9px] font-mono opacity-80">#f59e0b</span>
                </div>
                <div className="bg-red-50 text-red-850 border border-red-100 p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Destructive</span>
                  <span className="text-[9px] font-mono opacity-80">#ef4444</span>
                </div>
                <div className="bg-slate-50 text-slate-800 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[11px] font-bold block">Neutral</span>
                  <span className="text-[9px] font-mono opacity-80">#64748b</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Interactive Controls & Glassmorphism */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buttons Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Buttons</h3>
            <div className="flex flex-col gap-2.5">
              <button className="w-full px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                Primary Button
              </button>
              <button className="w-full px-4 py-2 border border-slate-250 text-slate-650 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all">
                Outline Button
              </button>
              <button className="w-full px-4 py-2 bg-red-50 text-red-750 hover:bg-red-100 text-xs font-bold rounded-xl transition-all border border-red-100">
                Destructive Button
              </button>
              <button className="w-full px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed" disabled>
                Disabled Button
              </button>
            </div>
          </div>

          {/* Form Controls Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Form Controls</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Input Field (Normal)</label>
                <input
                  type="text"
                  placeholder="Enter email address..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Menu</label>
                <select className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary bg-white">
                  <option>Month View</option>
                  <option>List View</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                />
                <span className="text-xs font-semibold text-slate-750">Toggle Option Checklist</span>
              </div>
            </div>
          </div>

          {/* Glassmorphism & Elevation */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Glassmorphism Panels</h3>
            <div className="bg-slate-100 p-4 rounded-2xl space-y-4 relative overflow-hidden">
              {/* Blur backdrop overlay demo */}
              <div className="glass-panel border border-white/40 p-4 rounded-xl shadow-md relative z-10">
                <h4 className="text-slate-800 text-xs font-bold">Glass Element</h4>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Utilizes <code>bg-white/65 backdrop-blur-md</code> for premium system overlay effects.
                </p>
              </div>

              <div className="absolute top-2 right-2 w-20 h-20 rounded-full bg-primary/20 blur-md -z-0" />
              <div className="absolute bottom-2 left-6 w-16 h-16 rounded-full bg-purple-300/30 blur-md -z-0" />
            </div>
          </div>
        </div>

        {/* Row 3: Calendar Pill & Tag States */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-slate-800 text-sm font-bold border-b border-slate-100 pb-2">Event Pills & Badges</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Standard Event Pill</span>
              <div className="bg-primary/10 border-l-[3px] border-primary text-primary px-2.5 py-1.5 rounded-r-md text-[11px] font-bold">
                Q4 Planning Offsite
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Warning/External event</span>
              <div className="bg-amber-50 border-l-[3px] border-amber-500 text-amber-800 px-2.5 py-1.5 rounded-r-md text-[11px] font-bold">
                External Client Demo
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Role Badges</span>
              <div className="flex gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-wider">
                  Owner
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  User
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Request States</span>
              <div className="flex gap-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-[9px] font-bold text-purple-700 uppercase tracking-wider">
                  Pending
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                  Approved
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
