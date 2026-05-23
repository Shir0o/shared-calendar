// Client wrappers for the Google Calendar (ICS-URL) sync Cloud Functions and
// the connection-status doc. The model is N feeds; the current UI surfaces
// only feeds[0] but the wire format is already plural.
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { app, db } from './firebase';
import type { CategoryId } from './calendar';

const fns = getFunctions(app);

interface ConnectInput {
  icsUrl: string;
  label?: string;
  defaultCat?: CategoryId;
}
interface ConnectResult { ok: true; feedId: string; count: number }
interface OkResult { ok: true; count?: number }

export const callGcalConnect = (input: ConnectInput) =>
  httpsCallable<ConnectInput, ConnectResult>(fns, 'gcalConnect')(input).then((r) => r.data);

export const callGcalDisconnect = (feedId: string) =>
  httpsCallable<{ feedId: string }, OkResult>(fns, 'gcalDisconnect')({ feedId }).then((r) => r.data);

export const callGcalSyncNow = (feedId?: string) =>
  httpsCallable<{ feedId?: string }, OkResult>(fns, 'gcalSyncNow')(feedId ? { feedId } : {}).then((r) => r.data);

export const callGcalRename = (feedId: string, label: string) =>
  httpsCallable<{ feedId: string; label: string }, OkResult>(fns, 'gcalRename')({ feedId, label }).then((r) => r.data);

// Non-secret per-feed status. The ICS URL itself lives in a server-only
// subcollection (`config/gcal_feeds/{feedId}`) that rules forbid clients
// from reading.
export interface GcalFeedStatus {
  feedId: string;
  label?: string;
  defaultCat?: CategoryId;
  lastSyncAt?: Date;
  lastSyncCount?: number;
}

function toDate(v: unknown): Date | undefined {
  return v instanceof Timestamp ? v.toDate() : undefined;
}

export function subscribeGcalFeeds(cb: (feeds: GcalFeedStatus[]) => void): () => void {
  return onSnapshot(doc(db, 'config', 'gcal'), (snap) => {
    if (!snap.exists()) return cb([]);
    const raw = (snap.data().feeds ?? {}) as Record<string, {
      label?: string; defaultCat?: CategoryId; lastSyncAt?: unknown; lastSyncCount?: number;
    }>;
    const feeds: GcalFeedStatus[] = Object.entries(raw).map(([feedId, v]) => ({
      feedId,
      label: v.label || undefined,
      defaultCat: v.defaultCat || undefined,
      lastSyncAt: toDate(v.lastSyncAt),
      lastSyncCount: v.lastSyncCount,
    }));
    feeds.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    cb(feeds);
  });
}
