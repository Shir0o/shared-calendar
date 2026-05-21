import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const SecurityView: React.FC = () => {
  const {
    whitelist,
    pendingRequests,
    addToWhitelist,
    removeFromWhitelist,
    approveRequest,
    rejectRequest
  } = useAuth();

  const [newEmail, setNewEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    if (whitelist.map(w => w.toLowerCase()).includes(email)) {
      setErrorMsg('This email is already whitelisted.');
      return;
    }

    addToWhitelist(email);
    setSuccessMsg(`"${email}" was successfully added to the whitelist.`);
    setNewEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    if (email === 'yilongwang05@gmail.com') {
      alert('The Owner account (yilongwang05@gmail.com) cannot be removed.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove "${email}" from the whitelist? They will lose access immediately.`)) {
      removeFromWhitelist(email);
      setSuccessMsg(`"${email}" was removed from the whitelist.`);
    }
  };

  // Filter whitelist based on search
  const filteredWhitelist = whitelist.filter(email =>
    email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background-light overflow-hidden font-sans">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 px-8 py-4 bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">admin_panel_settings</span>
          <div>
            <h2 className="text-slate-900 text-lg font-bold tracking-tight">Security & Access Control</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage the whitelist access, approve pending requests, and configure application security policies.
            </p>
          </div>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        {/* Status Dashboard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">vpn_lock</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Protocol</span>
              <span className="text-sm font-bold text-slate-800">Private Whitelist Only</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <span className="material-symbols-outlined text-2xl">group</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Whitelisted Accounts</span>
              <span className="text-sm font-bold text-slate-800">{whitelist.length} Authorized Emails</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Requests</span>
              <span className="text-sm font-bold text-slate-800">{pendingRequests.length} Approvals Due</span>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Whitelist Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-slate-800 text-sm font-bold">Approved Team Whitelist</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Only emails listed below can log in via Google authentication.</p>
              </div>

              {/* Search input */}
              <div className="relative w-48 md:w-64">
                <span className="material-symbols-outlined text-slate-400 text-sm absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input
                  type="text"
                  placeholder="Filter emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary bg-slate-50/50"
                />
              </div>
            </div>

            {/* Success and Error messages */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-100">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 text-xs font-semibold rounded-xl border border-red-100">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Whitelisted emails list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredWhitelist.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No whitelisted accounts found matching "{searchQuery}"
                </div>
              ) : (
                filteredWhitelist.map(email => {
                  const isOwner = email.toLowerCase() === 'yilongwang05@gmail.com';
                  return (
                    <div
                      key={email}
                      className="flex items-center justify-between p-3 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isOwner ? 'bg-primary/10 text-primary' : 'bg-slate-150 text-slate-600'}`}>
                          {email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 font-mono">{email}</p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                            {isOwner ? 'Owner / Admin' : 'Authorized User'}
                          </p>
                        </div>
                      </div>

                      {!isOwner && (
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Revoke access"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick add whitelist form */}
            <form onSubmit={handleAddEmail} className="flex gap-2 pt-4 border-t border-slate-100">
              <input
                type="email"
                placeholder="Add team member's email address..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Whitelist Email
              </button>
            </form>
          </div>

          {/* Pending Queue and System Policies */}
          <div className="space-y-6">
            {/* Join Requests */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-slate-800 text-sm font-bold">Access Request Queue</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Approve or deny pending team requests.</p>
              </div>

              <div className="space-y-3">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="material-symbols-outlined text-slate-350 text-2xl block mb-1">domain_verification</span>
                    <p className="text-xs font-semibold text-slate-400">Queue is clean</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">All access requests have been processed.</p>
                  </div>
                ) : (
                  pendingRequests.map(request => (
                    <div
                      key={request.email}
                      className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 hover:bg-white transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{request.name}</p>
                          <p className="text-[10px] font-semibold text-slate-500 font-mono truncate">{request.email}</p>
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                            Requested {new Date(request.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1.5 border-t border-slate-150/40">
                        <button
                          onClick={() => approveRequest(request.email, request.name)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest(request.email)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Static Security Settings Policy */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-slate-800 text-sm font-bold">Domain Security Rules</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">System-wide calendar permissions.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2 border border-slate-100 rounded-xl bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">g_mobiledata</span>
                    <div>
                      <p className="font-bold text-slate-700">Google Auth Only</p>
                      <p className="text-[9px] text-slate-400">Forces authentication via Google accounts.</p>
                    </div>
                  </div>
                  <div className="w-8 h-4 bg-primary/20 rounded-full relative flex items-center px-0.5">
                    <div className="w-3.5 h-3.5 bg-primary rounded-full absolute right-0.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 border border-slate-100 rounded-xl bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">shield</span>
                    <div>
                      <p className="font-bold text-slate-700">Strict IP Filtering</p>
                      <p className="text-[9px] text-slate-400">Lock down access to local VPN subnets.</p>
                    </div>
                  </div>
                  <div className="w-8 h-4 bg-slate-200 rounded-full relative flex items-center px-0.5">
                    <div className="w-3.5 h-3.5 bg-slate-400 rounded-full absolute left-0.5" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 border border-slate-100 rounded-xl bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">policy</span>
                    <div>
                      <p className="font-bold text-slate-700">Audit Logging</p>
                      <p className="text-[9px] text-slate-400">All modifications are preserved in audit trail.</p>
                    </div>
                  </div>
                  <div className="w-8 h-4 bg-primary/20 rounded-full relative flex items-center px-0.5">
                    <div className="w-3.5 h-3.5 bg-primary rounded-full absolute right-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
