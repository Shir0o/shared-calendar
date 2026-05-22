import { AuthProvider, useAuth } from './lib/auth';
import { CalendarApp } from './CalendarApp';
import { Gate } from './views/Gate';
import { PendingApproval } from './views/PendingApproval';

const ConfigMissing = () => (
  <div className="app theme-light density-default gate-screen" style={{ '--accent': 'oklch(0.5 0.18 265)' } as React.CSSProperties}>
    <div className="gate-card">
      <div className="brand-name" style={{ fontSize: 18 }}>Firebase not configured</div>
      <p className="gate-lead">
        Set <code>VITE_FIREBASE_API_KEY</code> and <code>VITE_FIREBASE_APP_ID</code> in <code>.env.local</code> (see <code>.env.example</code>),
        then restart the dev server.
      </p>
    </div>
  </div>
);

const Router = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="app theme-light density-default gate-screen">
        <div className="gate-card gate-loading mono">Loading…</div>
      </div>
    );
  }

  if (!user || !role) return <Gate />;
  if (role === 'pending') return <PendingApproval />;
  return <CalendarApp />;
};

export default function App() {
  if (!import.meta.env.VITE_FIREBASE_API_KEY || !import.meta.env.VITE_FIREBASE_APP_ID) {
    return <ConfigMissing />;
  }
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
