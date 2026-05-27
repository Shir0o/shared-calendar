import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { CalendarEvent } from './calendar';

vi.mock('./firebase', () => ({
  app: {},
  auth: {},
  db: {},
  googleProvider: {},
  MEMBER_EMAIL: 'members@cisa-cal.web.app',
  OWNER_EMAIL: 'yilongwang05@gmail.com',
}));

import { fromDoc as fromDocMock, toFirestore as toFirestoreMock } from './events';

describe('Timezone-agnostic all-day serialization', () => {
  it('serializes a local all-day event to UTC midnight', () => {
    // Event starting May 22 local midnight
    const localStart = new Date(2026, 4, 22, 0, 0, 0); // May 22, 2026 local
    const localEnd = new Date(2026, 4, 25, 0, 0, 0);   // May 25, 2026 local
    
    const ev: CalendarEvent = {
      id: 'test-1',
      title: 'Company Holiday',
      cat: 'holiday',
      start: localStart,
      allDay: true,
      end: localEnd,
    };

    const docData = toFirestoreMock(ev);
    const startTimestamp = docData.start as Timestamp;
    const endTimestamp = docData.end as Timestamp;

    // Must be serialized to exactly UTC midnight of the corresponding days
    const utcStart = startTimestamp.toDate();
    expect(utcStart.getUTCFullYear()).toBe(2026);
    expect(utcStart.getUTCMonth()).toBe(4); // May
    expect(utcStart.getUTCDate()).toBe(22);
    expect(utcStart.getUTCHours()).toBe(0);
    expect(utcStart.getUTCMinutes()).toBe(0);

    const utcEnd = endTimestamp.toDate();
    expect(utcEnd.getUTCFullYear()).toBe(2026);
    expect(utcEnd.getUTCMonth()).toBe(4); // May
    expect(utcEnd.getUTCDate()).toBe(25);
    expect(utcEnd.getUTCHours()).toBe(0);
  });

  it('deserializes a UTC midnight timestamp back to local midnight', () => {
    // Document data containing absolute UTC midnight timestamps
    const docData = {
      title: 'GCal Synced Event',
      cat: 'meeting',
      allDay: true,
      start: Timestamp.fromDate(new Date(Date.UTC(2026, 4, 22, 0, 0, 0))), // 2026-05-22T00:00:00Z
      end: Timestamp.fromDate(new Date(Date.UTC(2026, 4, 25, 0, 0, 0))),   // 2026-05-25T00:00:00Z
    };

    const ev = fromDocMock('test-2', docData);

    // Must yield local midnight on the respective dates
    expect(ev.start.getFullYear()).toBe(2026);
    expect(ev.start.getMonth()).toBe(4); // May
    expect(ev.start.getDate()).toBe(22);
    expect(ev.start.getHours()).toBe(0);
    expect(ev.start.getMinutes()).toBe(0);

    expect(ev.end).toBeDefined();
    expect(ev.end!.getFullYear()).toBe(2026);
    expect(ev.end!.getMonth()).toBe(4); // May
    expect(ev.end!.getDate()).toBe(25);
    expect(ev.end!.getHours()).toBe(0);
  });
});
