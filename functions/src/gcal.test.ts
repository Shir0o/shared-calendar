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

describe('planFeedSync — LAST-MODIFIED skip behavior', () => {
  const SAME = new Date('2026-06-01T08:00:00Z');
  const LATER = new Date('2026-06-02T09:00:00Z');

  const evWithLm = (uid: string, lm?: Date): ParsedEvent => ({ ...ev(uid), lastModified: lm });

  it('skips the upsert when both sides have equal lastModified', () => {
    const existing = [{ id: docIdForFeed(FEED_A, 'u1'), uid: 'u1', lastModified: SAME }];
    const plan = planFeedSync(FEED_A, existing, [evWithLm('u1', SAME)]);
    expect(plan.upserts).toEqual([]);
    expect(plan.skipped).toBe(1);
    expect(plan.deletes).toEqual([]);
  });

  it('upserts when lastModified has advanced', () => {
    const existing = [{ id: docIdForFeed(FEED_A, 'u1'), uid: 'u1', lastModified: SAME }];
    const plan = planFeedSync(FEED_A, existing, [evWithLm('u1', LATER)]);
    expect(plan.upserts).toEqual([{ id: docIdForFeed(FEED_A, 'u1'), uid: 'u1' }]);
    expect(plan.skipped).toBe(0);
  });

  it('upserts when the persisted lastModified is missing (first sync of legacy doc)', () => {
    const existing = [{ id: 'legacy', uid: 'u1' }]; // no lastModified
    const plan = planFeedSync(FEED_A, existing, [evWithLm('u1', SAME)]);
    expect(plan.upserts).toEqual([{ id: 'legacy', uid: 'u1' }]);
    expect(plan.skipped).toBe(0);
  });

  it('upserts when the parsed event has no lastModified (some feeds omit it)', () => {
    const existing = [{ id: docIdForFeed(FEED_A, 'u1'), uid: 'u1', lastModified: SAME }];
    const plan = planFeedSync(FEED_A, existing, [evWithLm('u1', undefined)]);
    expect(plan.upserts).toEqual([{ id: docIdForFeed(FEED_A, 'u1'), uid: 'u1' }]);
    expect(plan.skipped).toBe(0);
  });

  it('mixed feed: skips unchanged, writes changed, deletes missing', () => {
    const existing = [
      { id: docIdForFeed(FEED_A, 'same'), uid: 'same', lastModified: SAME },
      { id: docIdForFeed(FEED_A, 'changed'), uid: 'changed', lastModified: SAME },
      { id: docIdForFeed(FEED_A, 'gone'), uid: 'gone', lastModified: SAME },
    ];
    const parsed = [
      evWithLm('same', SAME),
      evWithLm('changed', LATER),
      evWithLm('new', SAME),
    ];
    const plan = planFeedSync(FEED_A, existing, parsed);
    expect(plan.skipped).toBe(1);
    expect(plan.upserts.map((u) => u.uid).sort()).toEqual(['changed', 'new']);
    expect(plan.deletes).toEqual([docIdForFeed(FEED_A, 'gone')]);
  });
});
