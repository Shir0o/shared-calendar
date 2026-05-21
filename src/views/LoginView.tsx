import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { signIn, user, requestAccess, isAuthenticating, signOut } = useAuth();
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample quick accounts for demo testing
  const demoAccounts = [
    { email: 'yilongwang05@gmail.com', name: 'Yilong Wang', role: 'Owner & Admin', avatarSeed: 'Yilong' },
    { email: 'sarah.connor@example.com', name: 'Sarah Connor', role: 'Whitelisted User', avatarSeed: 'Sarah' },
    { email: 'jane.foster@example.com', name: 'Jane Foster', role: 'Pending Approval', avatarSeed: 'Jane' },
  ];

  const handleDemoSignIn = async (email: string, name: string) => {
    setErrorMsg('');
    await signIn(email, name);
  };

  const handleCustomSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    const name = customName || customEmail.split('@')[0];
    const success = await signIn(customEmail.toLowerCase(), name);
    if (!success) {
      // User is not whitelisted
      setRequestSent(false);
    }
  };

  const handleRequestAccess = () => {
    if (user) {
      requestAccess(user.email, user.displayName);
      setRequestSent(true);
    }
  };

  // If user is logged in but role is NONE or PENDING, show Request Access screen
  if (user && (user.role === 'NONE' || user.role === 'PENDING')) {
    return (
      <div className="min-h-screen w-full bg-background-light flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full glass-panel border border-white/60 shadow-xl rounded-2xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl">lock_open</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Private System Access</h2>
          <p className="text-slate-500 text-sm mt-2">
            You signed in as <strong className="text-slate-800">{user.email}</strong>. This application is restricted to pre-approved team members.
          </p>

          {user.role === 'PENDING' || requestSent ? (
            <div className="w-full mt-8 bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-left">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-primary text-xl">hourglass_empty</span>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Access Request Pending</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Your request has been submitted to the workspace owner (<strong className="text-slate-600">yilongwang05@gmail.com</strong>). You will be granted access once approved.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full mt-8 flex flex-col gap-3">
              <button
                onClick={handleRequestAccess}
                className="w-full py-3 bg-primary hover:bg-blue-600 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                Request Approval
              </button>
            </div>
          )}

          <button
            onClick={signOut}
            className="mt-6 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background-light flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl" />

      <div className="max-w-xl w-full flex flex-col gap-6 z-10">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-md">
            <span className="material-symbols-outlined text-2xl">event_available</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-2">SoftSchedule</h1>
          <p className="text-slate-500 text-sm max-w-sm">
            High-density team calendar featuring glassmorphic mixed-pane workspace views.
          </p>
        </div>

        {/* Login Panel */}
        <div className="glass-panel border border-white/60 shadow-xl rounded-2xl p-8">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Sign In</h2>
          <p className="text-slate-500 text-xs mt-1 mb-6">
            Authenticate using your Google Workspace credentials.
          </p>

          {/* Quick Sign-In Options (For testing whitelists & access levels) */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
              Developer Demo Accounts
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  disabled={isAuthenticating}
                  onClick={() => handleDemoSignIn(account.email, account.name)}
                  className="flex flex-col items-start p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-left transition-all hover:scale-[1.02] shadow-sm disabled:opacity-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${account.avatarSeed}`}
                      alt={account.name}
                      className="w-6 h-6 rounded-full bg-slate-100 object-cover"
                    />
                    <span className="text-xs font-bold text-slate-900 truncate max-w-[100px]">
                      {account.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono truncate w-full">
                    {account.email}
                  </span>
                  <span className="mt-2 text-[10px] px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-600">
                    {account.role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Or Custom Sign-In
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Custom Sign-In Form */}
          <form onSubmit={handleCustomSignIn} className="mt-4 space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1">
                Google Account Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@gmail.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-600 mb-1">
                Display Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm transition-all outline-none"
              />
            </div>

            {errorMsg && <p className="text-red-500 text-xs font-medium">{errorMsg}</p>}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 bg-primary hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl font-semibold shadow-sm transition-all flex items-center justify-center gap-2 hover:shadow-md cursor-pointer"
            >
              {isAuthenticating ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
