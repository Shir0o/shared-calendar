import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { OWNER_EMAIL } from '../lib/firebase';
import { addAdmin, revokeAdmin, subscribeAdmins, type AdminRecord } from '../lib/admin';
import {
  callGcalConnect,
  callGcalDisconnect,
  callGcalSyncNow,
  subscribeGcalFeeds,
  type GcalFeedStatus,
} from '../lib/gcal';
import { Btn, Icon } from '../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AccessPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeAdmins(setAdmins), []);

  // ── Google Calendar (ICS-URL) connection state ───────────────────────────
  // The data model is multi-feed but this UI still surfaces only the first
  // feed; a follow-up will turn this into a list.
  const [feeds, setFeeds] = useState<GcalFeedStatus[]>([]);
  const [icsUrl, setIcsUrl] = useState('');
  const [gcalBusy, setGcalBusy] = useState<'idle' | 'connecting' | 'syncing' | 'disconnecting'>('idle');
  const [gcalError, setGcalError] = useState('');

  useEffect(() => subscribeGcalFeeds(setFeeds), []);
  const gcal = feeds[0] ?? null;

  const connectGcal = async () => {
    setGcalError('');
    setGcalBusy('connecting');
    try {
      await callGcalConnect({ icsUrl: icsUrl.trim() });
      setIcsUrl('');
    } catch (e) {
      setGcalError((e as Error).message || 'Could not connect.');
    } finally {
      setGcalBusy('idle');
    }
  };

  const syncGcal = async () => {
    if (!gcal) return;
    setGcalError('');
    setGcalBusy('syncing');
    try {
      await callGcalSyncNow(gcal.feedId);
    } catch (e) {
      setGcalError((e as Error).message || 'Sync failed.');
    } finally {
      setGcalBusy('idle');
    }
  };

  const disconnectGcal = async () => {
    if (!gcal) return;
    setGcalError('');
    setGcalBusy('disconnecting');
    try {
      await callGcalDisconnect(gcal.feedId);
    } catch (e) {
      setGcalError((e as Error).message || 'Disconnect failed.');
    } finally {
      setGcalBusy('idle');
    }
  };

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
            <label className="modal-label">Google Calendar sync</label>
            {gcal ? (
              <div className="gcal-connected">
                <div className="gcal-status">
                  <span className="gcal-pill mono">
                    <Icon name="check" size={10} /> CONNECTED
                  </span>
                  {gcal.lastSyncAt && (
                    <span className="gcal-meta mono">
                      last sync {gcal.lastSyncAt.toLocaleString()} · {gcal.lastSyncCount ?? 0} events
                    </span>
                  )}
                </div>
                <div className="gcal-actions">
                  <Btn variant="primary" leading="repeat" onClick={syncGcal} disabled={gcalBusy !== 'idle'}>
                    {gcalBusy === 'syncing' ? 'Syncing…' : 'Sync now'}
                  </Btn>
                  <Btn variant="ghost" danger leading="trash" onClick={disconnectGcal} disabled={gcalBusy !== 'idle'}>
                    Disconnect
                  </Btn>
                </div>
                <div className="access-empty mono gcal-hint">
                  The calendar URL is stored server-side and never returned to the browser.
                  To rotate it: in Google Calendar settings, reset the secret address, then disconnect and reconnect here.
                </div>
              </div>
            ) : (
              <div className="gcal-connect">
                <input
                  type="url"
                  className="modal-input mono"
                  placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                  value={icsUrl}
                  onChange={(e) => setIcsUrl(e.target.value)}
                />
                <Btn variant="primary" leading="check" onClick={connectGcal} disabled={gcalBusy !== 'idle' || !icsUrl.trim()}>
                  {gcalBusy === 'connecting' ? 'Connecting…' : 'Connect'}
                </Btn>
                <div className="access-empty mono gcal-hint">
                  Paste the “secret address in iCal format” from your Google Calendar settings.
                  Pulls every 30 minutes; one-way (GCal → app).
                </div>
              </div>
            )}
            {gcalError && <div className="access-empty mono">{gcalError}</div>}
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
