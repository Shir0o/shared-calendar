import { describe, expect, it } from 'vitest';
import { expandEvent, isoDate, startOfWeek, monthGrid, type CalendarEvent } from './calendar';

function mk(start: Date, rrule: CalendarEvent['rrule']): CalendarEvent {
  return { id: 'e1', title: 't', cat: 'meeting', start, allDay: true, dur: 0, rrule };
}

describe('expandEvent', () => {
  it('YEARLY: emits once per year on the same month/day', () => {
    const ev = mk(new Date(2024, 2, 1), { freq: 'yearly' }); // Mar 1 2024
    const out = expandEvent(ev, new Date(2024, 0, 1), new Date(2027, 0, 1));
    expect(out.map((i) => isoDate(i.start))).toEqual(['2024-03-01', '2025-03-01', '2026-03-01']);
  });

  it('YEARLY with interval=2: every other year', () => {
    const ev = mk(new Date(2024, 2, 1), { freq: 'yearly', interval: 2 });
    const out = expandEvent(ev, new Date(2024, 0, 1), new Date(2026, 11, 1));
    expect(out.map((i) => isoDate(i.start))).toEqual(['2024-03-01', '2026-03-01']);
  });

  it('YEARLY: clamps Feb 29 to Feb 28 in non-leap years', () => {
    const ev = mk(new Date(2024, 1, 29), { freq: 'yearly' });
    const out = expandEvent(ev, new Date(2024, 0, 1), new Date(2027, 0, 1));
    expect(out.map((i) => isoDate(i.start))).toEqual(['2024-02-29', '2025-02-28', '2026-02-28']);
  });

  it('MONTHLY+BYDAY=1SU: first Sunday of each month', () => {
    const ev = mk(new Date(2026, 0, 4), { freq: 'monthly', byday: ['1SU'] }); // Sun Jan 4 2026
    const out = expandEvent(ev, new Date(2026, 0, 1), new Date(2026, 4, 1));
    expect(out.map((i) => isoDate(i.start))).toEqual(['2026-01-04', '2026-02-01', '2026-03-01', '2026-04-05']);
  });

  it('MONTHLY+BYDAY=-1FR: last Friday of each month', () => {
    const ev = mk(new Date(2026, 0, 30), { freq: 'monthly', byday: ['-1FR'] }); // Fri Jan 30 2026
    const out = expandEvent(ev, new Date(2026, 0, 1), new Date(2026, 4, 1));
    expect(out.map((i) => isoDate(i.start))).toEqual(['2026-01-30', '2026-02-27', '2026-03-27', '2026-04-24']);
  });
});

describe('startOfWeek & monthGrid defaults', () => {
  it('startOfWeek starts on Sunday by default', () => {
    // Wednesday July 22 2026 -> Sunday July 19 2026
    const wed = new Date(2026, 6, 22);
    const start = startOfWeek(wed);
    expect(start.getDay()).toBe(0); // Sunday
    expect(isoDate(start)).toBe('2026-07-19');
  });

  it('monthGrid first cell is a Sunday by default', () => {
    const grid = monthGrid(new Date(2026, 6, 1)); // July 2026
    expect(grid[0].getDay()).toBe(0); // Sunday
  });
});
