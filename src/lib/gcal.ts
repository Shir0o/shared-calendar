// Client wrappers for the Google Calendar (ICS-URL) sync Cloud Functions and
// the connection-status doc.
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { app, db } from './firebase';

const fns = getFunctions(app);

type CallableResult = { ok: true; count?: number };

export const callGcalConnect = (icsUrl: string) =>
  httpsCallable<{ icsUrl: string }, CallableResult>(fns, 'gcalConnect')({ icsUrl }).then((r) => r.data);

export const callGcalDisconnect = () =>
  httpsCallable<unknown, CallableResult>(fns, 'gcalDisconnect')({}).then((r) => r.data);

export const callGcalSyncNow = () =>
  httpsCallable<unknown, CallableResult>(fns, 'gcalSyncNow')({}).then((r) => r.data);

// Non-secret connection status. The URL itself is stored in a sibling doc
// (config/gcal_secret) that rules forbid clients from reading.
export interface GcalConfig {
  connected: boolean;
  connectedAt?: Date;
  connectedBy?: string;
  lastSyncAt?: Date;
  lastSyncCount?: number;
}

function toDate(v: unknown): Date | undefined {
  return v instanceof Timestamp ? v.toDate() : undefined;
}

export function subscribeGcalConfig(cb: (c: GcalConfig | null) => void): () => void {
  return onSnapshot(doc(db, 'config', 'gcal'), (snap) => {
    if (!snap.exists()) return cb(null);
    const d = snap.data();
    cb({
      connected: d.connected === true,
      connectedAt: toDate(d.connectedAt),
      connectedBy: d.connectedBy,
      lastSyncAt: toDate(d.lastSyncAt),
      lastSyncCount: d.lastSyncCount,
    });
  });
}
