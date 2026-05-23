// Cloud Functions for the shared calendar.
// Currently implements one-way Google Calendar import via an "ICS secret URL"
// pasted by the owner. (GCal's ICS feed is read-only, so this direction is
// pull-only; the upgrade path to two-way OAuth is documented in the plan.)
//
// Functions:
//   gcalConnect    (callable, owner-only)  — paste URL, validate, persist, run an initial pull
//   gcalDisconnect (callable, owner-only)  — clear connection
//   gcalSyncNow    (callable, admin/owner) — pull immediately
//   gcalPoll       (scheduled, every 30m)  — auto-pull
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { docIdFromUid, eventsFromIcs, type ParsedEvent } from './ical.js';

initializeApp();
const db = getFirestore();

// Keep in sync with src/lib/firebase.ts + firestore.rules.
const OWNER_EMAIL = 'yilongwang05@gmail.com';

// Two-doc split so the URL is never reachable from the client:
//   STATUS  — owner-readable, holds non-secret connection metadata
//   SECRET  — admin-SDK only (rules deny all client access), holds the URL
const STATUS = () => db.collection('config').doc('gcal');
const SECRET = () => db.collection('config').doc('gcal_secret');

async function readIcsUrl(): Promise<string | null> {
  const snap = await SECRET().get();
  return (snap.data()?.icsUrl as string | undefined) ?? null;
}

function callerEmail(req: CallableRequest): string {
  return ((req.auth?.token?.email as string | undefined) ?? '').toLowerCase();
}
function isOwner(req: CallableRequest): boolean {
  return callerEmail(req) === OWNER_EMAIL.toLowerCase();
}
async function isAdminOrOwner(req: CallableRequest): Promise<boolean> {
  const email = callerEmail(req);
  if (!email) return false;
  if (email === OWNER_EMAIL.toLowerCase()) return true;
  const key = email.replace(/[^a-z0-9]+/g, '_');
  const snap = await db.collection('admins').doc(key).get();
  return snap.exists && snap.data()?.approved === true;
}

async function fetchIcs(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new HttpsError('failed-precondition', `Couldn't fetch calendar (HTTP ${res.status}).`);
  return await res.text();
}

// ─── Callables ───────────────────────────────────────────────────────────────
export const gcalConnect = onCall(async (req) => {
  if (!isOwner(req)) throw new HttpsError('permission-denied', 'Owner only.');
  const icsUrl = ((req.data?.icsUrl as string | undefined) ?? '').trim();
  if (!/^https?:\/\//i.test(icsUrl)) throw new HttpsError('invalid-argument', 'A full https:// URL is required.');

  const text = await fetchIcs(icsUrl);
  // Sanity-parse before persisting.
  let parsed: ParsedEvent[];
  try { parsed = eventsFromIcs(text); }
  catch { throw new HttpsError('failed-precondition', 'That URL did not return a valid iCalendar feed.'); }

  await SECRET().set({ icsUrl });
  await STATUS().set({
    connected: true,
    connectedAt: FieldValue.serverTimestamp(),
    connectedBy: callerEmail(req),
  }, { merge: true });

  const count = await applyPull(parsed);
  await STATUS().set({ lastSyncAt: FieldValue.serverTimestamp(), lastSyncCount: count }, { merge: true });
  return { ok: true, count };
});

export const gcalDisconnect = onCall(async (req) => {
  if (!isOwner(req)) throw new HttpsError('permission-denied', 'Owner only.');
  // We leave previously-synced events in place. The owner can delete them
  // manually or via a future "clear synced events" action.
  await Promise.all([SECRET().delete(), STATUS().delete()]);
  return { ok: true };
});

export const gcalSyncNow = onCall(async (req) => {
  if (!(await isAdminOrOwner(req))) throw new HttpsError('permission-denied', 'Admin only.');
  const url = await readIcsUrl();
  if (!url) throw new HttpsError('failed-precondition', 'Google Calendar is not connected.');
  const text = await fetchIcs(url);
  const parsed = eventsFromIcs(text);
  const count = await applyPull(parsed);
  await STATUS().set({ lastSyncAt: FieldValue.serverTimestamp(), lastSyncCount: count }, { merge: true });
  return { ok: true, count };
});

// ─── Scheduled auto-pull ─────────────────────────────────────────────────────
export const gcalPoll = onSchedule('every 30 minutes', async () => {
  const url = await readIcsUrl();
  if (!url) return;
  try {
    const text = await fetchIcs(url);
    const parsed = eventsFromIcs(text);
    const count = await applyPull(parsed);
    await STATUS().set({ lastSyncAt: FieldValue.serverTimestamp(), lastSyncCount: count }, { merge: true });
    logger.info(`gcalPoll synced ${count} events`);
  } catch (e) {
    logger.error('gcalPoll failed', e);
  }
});

// ─── Apply a parsed feed: upsert + delete-missing ────────────────────────────
async function applyPull(parsed: ParsedEvent[]): Promise<number> {
  // Snapshot existing GCal-sourced docs to detect deletions.
  const existing = await db.collection('events').where('syncOrigin', '==', 'gcal').get();
  const existingByUid = new Map<string, string>();
  existing.forEach((d) => {
    const uid = d.data().gcalUid as string | undefined;
    if (uid) existingByUid.set(uid, d.id);
  });

  const seen = new Set<string>();
  let batch = db.batch();
  let ops = 0;
  const commit = async () => { if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; } };

  for (const ev of parsed) {
    seen.add(ev.uid);
    const id = existingByUid.get(ev.uid) ?? docIdFromUid(ev.uid);
    batch.set(db.collection('events').doc(id), serialize(ev), { merge: true });
    if (++ops >= 400) await commit();
  }

  for (const [uid, id] of existingByUid) {
    if (!seen.has(uid)) {
      batch.delete(db.collection('events').doc(id));
      if (++ops >= 400) await commit();
    }
  }

  await commit();
  return parsed.length;
}

function serialize(ev: ParsedEvent): Record<string, unknown> {
  // Using `null` (not undefined) so set({merge:true}) deletes fields that
  // disappeared upstream (Firestore treats null as an explicit clear).
  const rrule = ev.rrule
    ? {
        freq: ev.rrule.freq,
        interval: ev.rrule.interval ?? null,
        byday: ev.rrule.byday ?? null,
        count: ev.rrule.count ?? null,
        until: ev.rrule.until ? Timestamp.fromDate(ev.rrule.until) : null,
      }
    : null;
  return {
    title: ev.title,
    cat: ev.cat,
    start: Timestamp.fromDate(ev.start),
    dur: ev.dur ?? null,
    allDay: ev.allDay,
    end: ev.end ? Timestamp.fromDate(ev.end) : null,
    loc: ev.loc ?? '',
    notes: ev.notes ?? '',
    rrule,
    gcalUid: ev.uid,
    syncOrigin: 'gcal',
    syncedAt: FieldValue.serverTimestamp(),
  };
}
