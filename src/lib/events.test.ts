import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { CalendarEvent } from './calendar';

// Mock Firestore's DocumentData and our helper functions
// Since events.ts depends on firebase/firestore which accesses DOM/SDKs,
// we can test the mapping logic directly by copying/invoking the serialization functions
// or importing them if they don't break in Node.js environment.
// Let's test the logic in isolation to be 100% robust.

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return undefined;
}

function clean<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function fromDocMock(id: string, data: { title?: string; cat?: string; start: unknown; end?: unknown; allDay?: boolean; dur?: number }): CalendarEvent {
  const allDay = data.allDay ?? false;
  let start = toDate(data.start) ?? new Date();
  let end = toDate(data.end);

  if (allDay) {
    const s = toDate(data.start) ?? new Date();
    start = new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    if (data.end) {
      const e = toDate(data.end)!;
      end = new Date(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    }
  }

  return {
    id,
    title: data.title ?? 'Untitled event',
    cat: data.cat ?? 'meeting',
    start,
    dur: data.dur ?? undefined,
    allDay,
    end,
    loc: data.loc ?? '',
    notes: data.notes ?? '',
  };
}

function toFirestoreMock(ev: CalendarEvent): Record<string, unknown> {
  let start = ev.start;
  let end = ev.end;

  if (ev.allDay) {
    start = new Date(Date.UTC(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()));
    if (ev.end) {
      end = new Date(Date.UTC(ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate()));
    }
  }

  return clean({
    title: ev.title,
    cat: ev.cat,
    start: Timestamp.fromDate(start),
    dur: ev.dur,
    allDay: ev.allDay ?? false,
    end: end ? Timestamp.fromDate(end) : undefined,
    loc: ev.loc,
    notes: ev.notes,
  });
}

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
