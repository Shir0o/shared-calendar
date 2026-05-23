import { describe, expect, it } from 'vitest';
import { docIdForFeed } from './ical.js';
import { planFeedSync, type ExistingDoc } from './sync.js';
import type { ParsedEvent } from './ical.js';

const FEED_A = 'feed-a';
const FEED_B = 'feed-b';

const ev = (uid: string): ParsedEvent => ({
  uid,
  title: `Event ${uid}`,
  cat: 'meeting',
  start: new Date('2026-06-01T10:00:00Z'),
  allDay: false,
  dur: 60,
});

describe('docIdForFeed', () => {
  it('produces distinct IDs for the same UID under different feeds', () => {
    const uid = 'same-uid@google.com';
    expect(docIdForFeed(FEED_A, uid)).not.toBe(docIdForFeed(FEED_B, uid));
  });

  it('is deterministic', () => {
    expect(docIdForFeed(FEED_A, 'u1')).toBe(docIdForFeed(FEED_A, 'u1'));
  });

  it('embeds both halves in the gcal_<feedHash>_<uidHash> shape', () => {
    expect(docIdForFeed(FEED_A, 'u1')).toMatch(/^gcal_[0-9a-f]{16}_[0-9a-f]{16}$/);
  });
});

describe('planFeedSync — per-feed deletion isolation', () => {
  it('only deletes docs from the feed being synced', () => {
    // Feed B had two events; the second has disappeared upstream. Feed A's
    // docs are NOT in `existing` because applyPull queries
    // `where('gcalFeedId', '==', feedId)` — this test enforces that
    // contract: given a per-feed snapshot, planFeedSync touches nothing
    // outside it.
    const existingB: ExistingDoc[] = [
      { id: docIdForFeed(FEED_B, 'b1'), uid: 'b1' },
      { id: docIdForFeed(FEED_B, 'b2'), uid: 'b2' },
    ];
    const parsedB = [ev('b1')]; // b2 dropped

    const plan = planFeedSync(FEED_B, existingB, parsedB);

    expect(plan.deletes).toEqual([docIdForFeed(FEED_B, 'b2')]);
    // No feed-A IDs anywhere in the plan.
    const allIds = [...plan.upserts.map((u) => u.id), ...plan.deletes];
    for (const id of allIds) {
      expect(id.startsWith(`gcal_${docIdForFeed(FEED_A, 'x').split('_')[1]}_`)).toBe(false);
    }
  });

  it('reuses an existing doc id when the UID is already present', () => {
    const existingId = 'legacy-id-from-old-schema';
    const plan = planFeedSync(FEED_A, [{ id: existingId, uid: 'u1' }], [ev('u1')]);
    expect(plan.upserts).toEqual([{ id: existingId, uid: 'u1' }]);
    expect(plan.deletes).toEqual([]);
  });

  it('mints a fresh feed-scoped id for new UIDs', () => {
    const plan = planFeedSync(FEED_A, [], [ev('u1')]);
    expect(plan.upserts).toEqual([{ id: docIdForFeed(FEED_A, 'u1'), uid: 'u1' }]);
  });
});
