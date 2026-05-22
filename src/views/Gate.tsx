import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Icon } from '../components/ui';

export const Gate = () => {
  const { signInMember, signInGoogle } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signInMember(password);
    } catch {
      setError('Incorrect password.');
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    try {
      await signInGoogle();
    } catch {
      setError('Google sign-in failed or was cancelled.');
    }
  };

  return (
    <div className="app theme-light density-default gate-screen" style={{ '--accent': 'oklch(0.5 0.18 265)', '--accent-soft': 'oklch(0.95 0.04 265)', '--accent-h': 265 } as React.CSSProperties}>
      <div className="gate-card">
        <div className="gate-brand">
          <div className="brand-mark" style={{ background: 'var(--accent)' }}>
            <span className="brand-glyph" />
          </div>
          <div>
            <div className="brand-name">Lattice</div>
            <div className="brand-sub mono">shared · calendar</div>
          </div>
        </div>

        <p className="gate-lead">A shared event calendar. Enter the team password to view and add events.</p>

        <form onSubmit={submit} className="gate-form">
          <label className="modal-label">Team password</label>
          <input
            type="password"
            className="modal-input mono"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button type="submit" className="btn btn-primary gate-submit" disabled={busy || !password}>
            <Icon name="lock" size={12} />
            <span>{busy ? 'Unlocking…' : 'Enter calendar'}</span>
          </button>
        </form>

        <div className="gate-divider mono">or</div>

        <button className="btn btn-ghost gate-google" onClick={google}>
          <Icon name="google" size={15} />
          <span>Sign in as admin with Google</span>
        </button>

        {error && <div className="gate-error mono">{error}</div>}
      </div>
    </div>
  );
};
