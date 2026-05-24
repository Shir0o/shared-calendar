// Cloud Functions for the shared calendar.
// One-way Google Calendar import via per-feed "ICS secret URL"s pasted by
// the owner. (GCal's ICS feed is read-only, so the upgrade path to two-way
// OAuth is documented in the plan.)
//
// Feed model (N feeds; current UI happens to surface N=1):
//   config/gcal_feeds/{feedId} — server-only: { icsUrl, label, defaultCat?,
//                                              connectedAt, connectedBy }
//   config/gcal                — owner-readable aggregate status:
//                                { feeds: { [feedId]: { label, lastSyncAt,
//                                                       lastSyncCount } } }
//
// Functions:
//   gcalConnect    (callable, owner-only)  — connect a new feed
//   gcalDisconnect (callable, owner-only)  — disconnect a feed by id
//   gcalSyncNow    (callable, admin/owner) — sync one feed (or all)
//   gcalPoll       (scheduled, every 30m)  — auto-pull every feed in parallel
import { randomUUID } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { eventsFromIcs, type ParsedEvent } from './ical.js';
import { planFeedSync, type ExistingDoc } from './sync.js';
import {
  GcalConnectResponse,
  GcalDisconnectResponse,
  GcalPurgeOrphanResponse,
  GcalSyncNowResponse,
} from './schemas.js';

initializeApp();
const db = getFirestore();

// Source of truth: shared/owner.ts. Cloud Functions deploys only this
// directory so we can't import across the workspace at runtime — the literal
// is duplicated here and a drift-guard test (src/lib/owner.test.ts) keeps
// these three sites (here, src/lib/firebase.ts via shared/, firestore.rules)
// from disagreeing.
const OWNER_EMAIL = 'yilongwang05@gmail.com';

const STATUS = () => db.collection('config').doc('gcal');
const FEEDS = () => db.collection('config').doc('gcal_feeds').collection('feeds');
const FEED = (id: string) => FEEDS().doc(id);

interface FeedDoc {
  icsUrl: string;
  label?: string;
  defaultCat?: string;
}

async function readFeed(feedId: string): Promise<FeedDoc | null> {
  const snap = await FEED(feedId).get();
  if (!snap.exists) return null;
  const d = snap.data() as FeedDoc;
  return d.icsUrl ? d : null;
}

async function listFeedIds(): Promise<string[]> {
  const snap = await FEEDS().get();
  return snap.docs.map((d) => d.id);
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
  // Doc ID is the raw lowercase email — matches src/lib/auth.tsx emailKey()
  // and firestore.rules `emailKey()`. Keep these three in sync.
  const snap = await db.collection('admins').doc(email).get();
  return snap.exists && snap.data()?.approved === true;
}

async function fetchIcs(url: string): Promise<string> {
  // 10-second budget so a slow/unresponsive feed can't pin the function.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new HttpsError('failed-precondition', `Couldn't fetch calendar (HTTP ${res.status}).`);
    return await res.text();
  } catch (e) {
    if ((e as { name?: string }).name === 'AbortError') {
      throw new HttpsError('deadline-exceeded', 'Calendar feed timed out (10s).');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Callables ───────────────────────────────────────────────────────────────
export const gcalConnect = onCall(async (req) => {
  if (!isOwner(req)) throw new HttpsError('permission-denied', 'Owner only.');
  const icsUrl = ((req.data?.icsUrl as string | undefined) ?? '').trim();
  const label = ((req.data?.label as string | undefined) ?? '').trim();
  const defaultCat = (req.data?.defaultCat as string | undefined) || undefined;
  if (!/^https?:\/\//i.test(icsUrl)) throw new HttpsError('invalid-argument', 'A full https:// URL is required.');

  const text = await fetchIcs(icsUrl);
  // Sanity-parse before persisting.
  let parsed: ParsedEvent[];
  try { parsed = eventsFromIcs(text); }
  catch { throw new HttpsError('failed-precondition', 'That URL did not return a valid iCalendar feed.'); }

  const feedId = randomUUID();
  await FEED(feedId).set({
    icsUrl,
    label: label || null,
    defaultCat: defaultCat || null,
    connectedAt: FieldValue.serverTimestamp(),
    connectedBy: callerEmail(req),
  });

  const result = await applyPull(feedId, defaultCat, parsed);
  await STATUS().set({
    feeds: { [feedId]: {
      label: label || null,
      defaultCat: defaultCat || null,
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncCount: result.total,
    } },
  }, { merge: true });
  return GcalConnectResponse.parse({ ok: true, feedId, count: result.total });
});

export const gcalRename = onCall(async (req) => {
  if (!isOwner(req)) throw new HttpsError('permission-denied', 'Owner only.');
  const feedId = ((req.data?.feedId as string | undefined) ?? '').trim();
  const label = ((req.data?.label as string | undefined) ?? '').trim();
  if (!feedId) throw new HttpsError('invalid-argument', 'feedId is required.');
  if (!label) throw new HttpsError('invalid-argument', 'A label is required.');
  if (label.length > 40) throw new HttpsError('invalid-argument', 'Label is too long (max 40 chars).');
  const feed = await readFeed(feedId);
  if (!feed) throw new HttpsError('not-found', 'That feed no longer exists.');
  // Batch + dot-notation: atomic, and the dotted path makes it unambiguous
  // that we're only touching `label` (not replacing the per-feed entry).
  const batch = db.batch();
  batch.set(FEED(feedId), { label }, { merge: true });
  batch.update(STATUS(), { [`feeds.${feedId}.label`]: label });
  await batch.commit();
  return { ok: true };
});

export const gcalDisconnect = onCall(async (req) => {
  if (!isOwner(req)) throw new HttpsError('permission-denied', 'Owner only.');
  const feedId = ((req.data?.feedId as string | undefined) ?? '').trim();
  if (!feedId) throw new HttpsError('invalid-argument', 'feedId is required.');
  const clearEvents = req.data?.clearEvents === true;

  // Atomic: a half-failed run would leave a feed doc with no aggregate entry
  // (or vice versa). Match the batched pattern in gcalRename.
  const batch = db.batch();
  batch.delete(FEED(feedId));
  batch.update(STATUS(), { [`feeds.${feedId}`]: FieldValue.delete() });
  await batch.commit();

  // Optionally purge all synced events that came from this feed. We do this
  // *after* the feed-doc delete so a half-failed run leaves no zombie source
  // that could re-create events on the next scheduled poll.
  let deleted = 0;
  if (clearEvents) {
    deleted = await deleteEventsByFeed(feedId);
  }
  return GcalDisconnectResponse.parse({ ok: true, deleted });
});

// Purge events for a feed that's already gone from `config/gcal_feeds` (orphans).
// The disconnect path uses the same helper; this callable surfaces it to the UI
// so the owner can clean up state left behind by past dev sessions.
export const gcalPurgeOrphan = onCall(async (req) => {
  if (!isOwner(req)) throw new HttpsError('permission-denied', 'Owner only.');
  const feedId = ((req.data?.feedId as string | undefined) ?? '').trim();
  if (!feedId) throw new HttpsError('invalid-argument', 'feedId is required.');
  const feedDoc = await FEED(feedId).get();
  if (feedDoc.exists) {
    throw new HttpsError('failed-precondition', 'Feed is still connected — disconnect it first.');
  }
  const deleted = await deleteEventsByFeed(feedId);
  return GcalPurgeOrphanResponse.parse({ ok: true, deleted });
});

// Paginate so a feed with thousands of events doesn't OOM the function or
// blow past the 9-min timeout. .select() projects away field data — we only
// need refs to delete.
const PAGE = 400;
async function deleteEventsByFeed(feedId: string): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await db
      .collection('events')
      .where('gcalFeedId', '==', feedId)
      .select()
      .limit(PAGE)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < PAGE) break;
  }
  return total;
}

export const gcalSyncNow = onCall(async (req) => {
  if (!(await isAdminOrOwner(req))) throw new HttpsError('permission-denied', 'Admin only.');
  const feedId = ((req.data?.feedId as string | undefined) ?? '').trim();
  const ids = feedId ? [feedId] : await listFeedIds();
  if (ids.length === 0) throw new HttpsError('failed-precondition', 'No Google Calendar feeds are connected.');
  let total = 0;
  let written = 0;
  let skipped = 0;
  for (const id of ids) {
    const res = await syncOneFeed(id);
    if (res !== null) {
      total += res.total;
      written += res.written;
      skipped += res.skipped;
    }
  }
  return GcalSyncNowResponse.parse({ ok: true, count: total, written, skipped });
});

// ─── Scheduled auto-pull ─────────────────────────────────────────────────────
export const gcalPoll = onSchedule('every 30 minutes', async () => {
  const ids = await listFeedIds();
  if (ids.length === 0) {
    logger.info('gcalPoll: no feeds connected, skipping');
    return;
  }
  const results = await Promise.allSettled(ids.map((id) => syncOneFeed(id)));
  results.forEach((r, i) => {
    const id = ids[i];
    if (r.status === 'fulfilled') {
      const v = r.value;
      if (v === null) {
        logger.info(`gcalPoll feed=${id} disappeared mid-sync`);
      } else {
        logger.info(
          `gcalPoll feed=${id} total=${v.total} written=${v.written} skipped=${v.skipped} deleted=${v.deleted}`,
        );
      }
    } else {
      logger.error(`gcalPoll feed=${id} failed`, r.reason);
    }
  });
});

interface SyncResult { total: number; written: number; skipped: number; deleted: number }

// Sync a single feed and record its status. Returns a SyncResult, or null if
// the feed doc is missing (raced with disconnect).
async function syncOneFeed(feedId: string): Promise<SyncResult | null> {
  const feed = await readFeed(feedId);
  if (!feed) return null;
  const text = await fetchIcs(feed.icsUrl);
  const parsed = eventsFromIcs(text);
  const result = await applyPull(feedId, feed.defaultCat, parsed);
  await STATUS().set({
    feeds: { [feedId]: {
      label: feed.label ?? null,
      defaultCat: feed.defaultCat ?? null,
      lastSyncAt: FieldValue.serverTimestamp(),
      lastSyncCount: result.total,
    } },
  }, { merge: true });
  return result;
}

// ─── Apply a parsed feed: upsert + delete-missing, scoped to one feed ────────
async function applyPull(
  feedId: string,
  defaultCat: string | undefined,
  parsed: ParsedEvent[],
): Promise<SyncResult> {
  // Per-feed snapshot — must filter by gcalFeedId so syncing feed B does not
  // delete feed A's events. Project to only the fields we need so a feed with
  // long notes/loc doesn't balloon memory on the function instance.
  const existingSnap = await db
    .collection('events')
    .where('gcalFeedId', '==', feedId)
    .select('gcalUid', 'lastModified', 'rrule')
    .get();
  const existing: ExistingDoc[] = [];
  existingSnap.forEach((d) => {
    const uid = d.data().gcalUid as string | undefined;
    if (!uid) return;
    const lmTs = d.data().lastModified as Timestamp | undefined;
    existing.push({ id: d.id, uid, lastModified: lmTs?.toDate(), hasRrule: !!d.data().rrule });
  });

  const plan = planFeedSync(feedId, existing, parsed);
  const parsedByUid = new Map(parsed.map((e) => [e.uid, e]));

  let batch = db.batch();
  let ops = 0;
  const commit = async () => { if (ops > 0) { await batch.commit(); batch = db.batch(); ops = 0; } };

  // Only iterate the planned upserts — unchanged events are skipped entirely.
  for (const u of plan.upserts) {
    const ev = parsedByUid.get(u.uid)!;
    batch.set(db.collection('events').doc(u.id), serialize(feedId, defaultCat, ev), { merge: true });
    if (++ops >= 400) await commit();
  }
  for (const id of plan.deletes) {
    batch.delete(db.collection('events').doc(id));
    if (++ops >= 400) await commit();
  }
  await commit();
  return {
    total: parsed.length,
    written: plan.upserts.length,
    skipped: plan.skipped,
    deleted: plan.deletes.length,
  };
}

function serialize(feedId: string, defaultCat: string | undefined, ev: ParsedEvent): Record<string, unknown> {
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
    cat: defaultCat || ev.cat,
    start: Timestamp.fromDate(ev.start),
    dur: ev.dur ?? null,
    allDay: ev.allDay,
    end: ev.end ? Timestamp.fromDate(ev.end) : null,
    loc: ev.loc ?? '',
    notes: ev.notes ?? '',
    rrule,
    gcalUid: ev.uid,
    gcalFeedId: feedId,
    // Persisted so the next pull can skip the write when LAST-MODIFIED is
    // unchanged. null clears any stale value when the feed stops providing it.
    lastModified: ev.lastModified ? Timestamp.fromDate(ev.lastModified) : null,
    syncOrigin: 'gcal',
    syncedAt: FieldValue.serverTimestamp(),
  };
}
