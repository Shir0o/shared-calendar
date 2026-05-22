import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { OWNER_EMAIL } from '../lib/firebase';
import { addAdmin, revokeAdmin, subscribeAdmins, type AdminRecord } from '../lib/admin';
import { Btn, Icon } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AccessPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeAdmins(setAdmins), []);

  const me = user?.email || '';

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await addAdmin(value, me);
      setEmail('');
    } catch {
      setError('Failed to add admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal access-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Members &amp; access</h3>
          <button className="iconbtn" onClick={onClose} aria-label="Close">
            <Icon name="close" size={12} />
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-row">
            <label className="modal-label">Add admin by email</label>
            <form onSubmit={add} className="access-add">
              <input
                type="email"
                className="modal-input mono"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              <Btn variant="primary" leading="check" type="submit" disabled={loading}>
                Add
              </Btn>
            </form>
            {error && <div className="access-empty mono">{error}</div>}
          </div>

          <div className="modal-row">
            <label className="modal-label">Admins</label>
            <ul className="access-list">
              <li className="access-row">
                <Icon name="shield" size={13} />
                <span className="access-email">{OWNER_EMAIL}</span>
                <span className="access-tag mono">OWNER</span>
              </li>
              {admins
                .filter((a) => a.email.toLowerCase() !== OWNER_EMAIL.toLowerCase())
                .map((a) => (
                  <li key={a.email} className="access-row">
                    <Icon name="shield" size={13} />
                    <span className="access-email">{a.email}</span>
                    <span className="access-tag mono">ADMIN</span>
                    <Btn variant="ghost" danger leading="trash" onClick={() => revokeAdmin(a.email)}>
                      Revoke
                    </Btn>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
