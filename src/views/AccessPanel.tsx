import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { OWNER_EMAIL } from '../lib/firebase';
import { addAdmin, revokeAdmin, subscribeAdmins, type AdminRecord } from '../lib/admin';
import {
  callGcalConnect,
  callGcalDisconnect,
  callGcalRename,
  callGcalSyncNow,
  subscribeGcalFeeds,
  type GcalFeedStatus,
} from '../lib/gcal';
import { CATEGORIES, CAT_BY_ID, type CategoryId } from '../lib/calendar';
import { Btn, Icon } from '../components/ui';

const LABEL_MAX = 40;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AccessPanel = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => subscribeAdmins(setAdmins), []);

  // ── Google Calendar (ICS-URL) feeds ───────────────────────────────────────
  const [feeds, setFeeds] = useState<GcalFeedStatus[]>([]);
  useEffect(() => subscribeGcalFeeds(setFeeds), []);

  // Add-feed form
  const [addLabel, setAddLabel] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [addCat, setAddCat] = useState<CategoryId>('meeting');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');

  const connectFeed = async () => {
    const label = addLabel.trim();
    const icsUrl = addUrl.trim();
    if (!label || !icsUrl) return;
    setAddError('');
    setAddBusy(true);
    try {
      await callGcalConnect({ icsUrl, label, defaultCat: addCat });
      setAddLabel('');
      setAddUrl('');
      setAddCat('meeting');
    } catch (e) {
      setAddError((e as Error).message || 'Could not connect.');
    } finally {
      setAddBusy(false);
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
            <label className="modal-label">
              Google Calendar sync · {feeds.length} connected
            </label>
            {feeds.length > 0 && (
              <ul className="gcal-feed-list">
                {feeds.map((f) => (
                  <FeedRow key={f.feedId} feed={f} />
                ))}
              </ul>
            )}
            <div className="gcal-add">
              <input
                type="text"
                className="modal-input"
                placeholder="Label (e.g. Engineering Calendar)"
                value={addLabel}
                maxLength={LABEL_MAX}
                onChange={(e) => setAddLabel(e.target.value)}
              />
              <input
                type="url"
                className="modal-input mono"
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
              />
              <div className="gcal-add-row">
                <select
                  className="twk-select"
                  value={addCat}
                  onChange={(e) => setAddCat(e.target.value as CategoryId)}
                  aria-label="Default category"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>Default: {c.label}</option>
                  ))}
                </select>
                <Btn
                  variant="primary"
                  leading="plus"
                  onClick={connectFeed}
                  disabled={addBusy || !addLabel.trim() || !addUrl.trim()}
                >
                  {addBusy ? 'Connecting…' : 'Connect'}
                </Btn>
              </div>
              <div className="access-empty mono gcal-hint">
                Paste the “secret address in iCal format” from each Google Calendar’s settings.
                Pulls every 30 minutes; one-way (GCal → app).
              </div>
              {addError && <div className="access-empty mono">{addError}</div>}
            </div>
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

type FeedBusy = 'syncing' | 'disconnecting' | 'renaming' | null;

const FeedRow = ({ feed }: { feed: GcalFeedStatus }) => {
  const [busy, setBusy] = useState<FeedBusy>(null);
  const [error, setError] = useState('');
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(feed.label ?? '');
  // Escape sets editing=false, which unmounts the input and fires onBlur.
  // This ref tells the blur handler to skip the save in that case.
  const cancelledRef = useRef(false);

  const sync = async () => {
    setError('');
    setBusy('syncing');
    try {
      await callGcalSyncNow(feed.feedId);
    } catch (e) {
      setError((e as Error).message || 'Sync failed.');
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setError('');
    setBusy('disconnecting');
    try {
      await callGcalDisconnect(feed.feedId);
    } catch (e) {
      setError((e as Error).message || 'Disconnect failed.');
      setBusy(null);
    }
    // No need to clear busy on success — the row will unmount.
  };

  const saveLabel = async () => {
    if (busy) return;
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    const label = draftLabel.trim();
    if (!label || label === feed.label) {
      setEditing(false);
      setDraftLabel(feed.label ?? '');
      return;
    }
    setError('');
    setBusy('renaming');
    try {
      await callGcalRename(feed.feedId, label);
      setEditing(false);
    } catch (e) {
      setError((e as Error).message || 'Rename failed.');
    } finally {
      setBusy(null);
    }
  };

  const catLabel = feed.defaultCat ? (CAT_BY_ID[feed.defaultCat]?.label ?? feed.defaultCat) : '—';
  const lastSync = feed.lastSyncAt ? feed.lastSyncAt.toLocaleString() : 'never';
  const isBusy = busy !== null;

  return (
    <li className="gcal-feed-row">
      <div className="gcal-feed-main">
        <div className="gcal-feed-head">
          {editing ? (
            <input
              type="text"
              className="modal-input gcal-feed-label-input"
              value={draftLabel}
              maxLength={LABEL_MAX}
              autoFocus
              onChange={(e) => setDraftLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveLabel();
                if (e.key === 'Escape') {
                  cancelledRef.current = true;
                  setEditing(false);
                  setDraftLabel(feed.label ?? '');
                }
              }}
              onBlur={saveLabel}
              disabled={busy === 'renaming'}
            />
          ) : (
            <>
              <span className="gcal-feed-label">{feed.label || '(unlabeled feed)'}</span>
              <button
                type="button"
                className="iconbtn gcal-feed-edit"
                aria-label="Rename feed"
                onClick={() => { setDraftLabel(feed.label ?? ''); setEditing(true); }}
                disabled={isBusy}
              >
                <Icon name="edit" size={11} />
              </button>
            </>
          )}
          <span className="gcal-pill mono">
            <Icon name="check" size={10} /> CONNECTED
          </span>
        </div>
        <div className="gcal-meta mono">
          last sync {lastSync} · {feed.lastSyncCount ?? 0} events · default category: {catLabel}
        </div>
        {error && <div className="access-empty mono">{error}</div>}
        {confirmingDisconnect && (
          <div className="gcal-confirm">
            <span className="gcal-confirm-text mono">
              Disconnect will stop syncing; existing events stay. Are you sure?
            </span>
            <div className="gcal-actions">
              <Btn variant="ghost" danger leading="trash" onClick={disconnect} disabled={isBusy}>
                {busy === 'disconnecting' ? 'Disconnecting…' : 'Yes, disconnect'}
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmingDisconnect(false)} disabled={isBusy}>
                Cancel
              </Btn>
            </div>
          </div>
        )}
      </div>
      {!confirmingDisconnect && (
        <div className="gcal-actions">
          <Btn variant="ghost" leading="repeat" onClick={sync} disabled={isBusy}>
            {busy === 'syncing' ? 'Syncing…' : 'Sync now'}
          </Btn>
          <Btn variant="ghost" danger leading="trash" onClick={() => setConfirmingDisconnect(true)} disabled={isBusy}>
            Disconnect
          </Btn>
        </div>
      )}
    </li>
  );
};
