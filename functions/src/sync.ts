// Pure (Firestore-free) sync planning. Extracted from index.ts so it can be
// unit-tested without booting firebase-admin.
import { docIdForFeed, type ParsedEvent } from './ical.js';

export interface ExistingDoc {
  id: string;
  uid: string;
  // Previously-persisted ICS LAST-MODIFIED, if we have one. Used by the
  // planner to skip Firestore writes when the upstream event is unchanged.
  lastModified?: Date;
  // Whether the persisted doc currently has an rrule. Tracked so that when
  // the parser starts recognizing a frequency it previously dropped (e.g.
  // YEARLY support landing later), the next sync rewrites the doc even when
  // LAST-MODIFIED hasn't moved.
  hasRrule?: boolean;
}

export interface SyncPlan {
  // Docs that actually need writing (new or changed). Skipped events are
  // omitted — applyPull iterates `upserts` directly.
  upserts: { id: string; uid: string }[];
  deletes: string[];
  // Count of events present in the feed whose LAST-MODIFIED matched the
  // persisted value and were therefore left untouched. Surfaced in logs.
  skipped: number;
}

// Given a per-feed snapshot (caller MUST filter by gcalFeedId) and a freshly
// parsed event list, decide which docs to upsert/delete and which writes to
// skip because LAST-MODIFIED is unchanged.
//
// Skip rule: both the existing doc and the parsed event have a defined
// lastModified AND their timestamps are equal (millisecond comparison). Any
// other shape (either missing, or different) falls through to upsert — a safe
// default that never silently drops a real change.
export function planFeedSync(
  feedId: string,
  existing: ExistingDoc[],
  parsed: ParsedEvent[],
): SyncPlan {
  const existingByUid = new Map(existing.map((e) => [e.uid, e]));
  const seen = new Set<string>();
  const upserts: { id: string; uid: string }[] = [];
  let skipped = 0;

  for (const ev of parsed) {
    seen.add(ev.uid);
    const prev = existingByUid.get(ev.uid);
    const id = prev?.id ?? docIdForFeed(feedId, ev.uid);

    if (
      prev &&
      prev.lastModified &&
      ev.lastModified &&
      prev.lastModified.getTime() === ev.lastModified.getTime() &&
      !!prev.hasRrule === !!ev.rrule
    ) {
      skipped++;
      continue;
    }

    upserts.push({ id, uid: ev.uid });
  }

  const deletes: string[] = [];
  for (const [uid, e] of existingByUid) {
    if (!seen.has(uid)) deletes.push(e.id);
  }
  return { upserts, deletes, skipped };
}
