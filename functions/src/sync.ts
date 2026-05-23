// Pure (Firestore-free) sync planning. Extracted from index.ts so it can be
// unit-tested without booting firebase-admin.
import { docIdForFeed, type ParsedEvent } from './ical.js';

export interface ExistingDoc { id: string; uid: string }

export interface SyncPlan {
  upserts: { id: string; uid: string }[];
  deletes: string[];
}

// Given a per-feed snapshot (caller MUST filter by gcalFeedId) and a freshly
// parsed event list, decide which docs to upsert and which to delete.
export function planFeedSync(
  feedId: string,
  existing: ExistingDoc[],
  parsed: ParsedEvent[],
): SyncPlan {
  const existingByUid = new Map(existing.map((e) => [e.uid, e.id]));
  const seen = new Set<string>();
  const upserts: { id: string; uid: string }[] = [];
  for (const ev of parsed) {
    seen.add(ev.uid);
    const id = existingByUid.get(ev.uid) ?? docIdForFeed(feedId, ev.uid);
    upserts.push({ id, uid: ev.uid });
  }
  const deletes: string[] = [];
  for (const [uid, id] of existingByUid) {
    if (!seen.has(uid)) deletes.push(id);
  }
  return { upserts, deletes };
}
