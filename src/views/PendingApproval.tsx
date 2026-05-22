import { useAuth } from '../lib/auth';
import { Icon } from '../components/ui';

export const PendingApproval = () => {
  const { user, signOutUser } = useAuth();
  return (
    <div className="app theme-light density-default gate-screen" style={{ '--accent': 'oklch(0.5 0.18 265)', '--accent-soft': 'oklch(0.95 0.04 265)', '--accent-h': 265 } as React.CSSProperties}>
      <div className="gate-card">
        <div className="gate-icon-badge">
          <Icon name="clock" size={22} />
        </div>
        <div className="brand-name" style={{ fontSize: 18, textAlign: 'center' }}>Awaiting approval</div>
        <p className="gate-lead" style={{ textAlign: 'center' }}>
          Your request to join as an admin has been sent to the owner. You'll get full access once it's approved.
        </p>
        <div className="gate-pending-email mono">{user?.email}</div>
        <button className="btn btn-ghost gate-google" onClick={signOutUser}>
          <Icon name="logout" size={13} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};
