// Tool-layer tests. The store is in-memory so these run with no Firebase,
// no credentials and no network.
import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../../src/lib/calendar';
import type { AuditEntry, CalendarStore, EventInput, EventPatch, ToolContext } from '../src/types';
import { TOOLS } from '../src/tools';

class MemoryStore implements CalendarStore {
  events = new Map<string, CalendarEvent>();
  audits: AuditEntry[] = [];
  private seq = 0;

  async listEvents(): Promise<CalendarEvent[]> {
    return [...this.events.values()];
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    return this.events.get(id) ?? null;
  }

  async createEvent(input: EventInput): Promise<string> {
    const id = `ev${++this.seq}`;
    this.events.set(id, { id, ...input });
    return id;
  }

  async updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent> {
    const current = this.events.get(id);
    if (!current) throw new Error(`No event with id ${id}`);
    const next: CalendarEvent = { ...current, ...patch, start: patch.start ?? current.start };
    this.events.set(id, next);
    return next;
  }

  async deleteEvents(ids: string[]): Promise<number> {
    for (const id of ids) this.events.delete(id);
    return ids.length;
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    this.audits.push(entry);
  }
}

function tool(name: string) {
  const found = TOOLS.find((t) => t.name === name);
  if (!found) throw new Error(`No tool ${name}`);
  return found;
}

function ctxFor(store: CalendarStore): ToolContext {
  return { store, actor: 'test' };
}

async function call(store: CalendarStore, name: string, args: unknown) {
  const result = await tool(name).run(ctxFor(store), args);
  return { ...result, body: result.text ? JSON.parse(result.text) : undefined };
}

describe('create_event', () => {
  it('creates a timed event and records an audit entry', async () => {
    const store = new MemoryStore();
    const res = await call(store, 'create_event', {
      title: 'Quarterly review',
      category: 'meeting',
      start: '2026-03-02T10:00:00Z',
      duration_minutes: 90,
      location: 'Room 4',
    });

    expect(res.isError).toBeUndefined();
    expect(res.body.ok).toBe(true);
    expect(res.body.event.title).toBe('Quarterly review');
    expect(res.body.event.duration_minutes).toBe(90);
    expect(store.events.size).toBe(1);
    expect(store.audits).toHaveLength(1);
    expect(store.audits[0]).toMatchObject({ action: 'create', actor: 'test' });
  });

  it('rejects a timed event with neither duration nor end', async () => {
    const store = new MemoryStore();
    await expect(
      call(store, 'create_event', { title: 'No length', category: 'meeting', start: '2026-03-02T10:00:00Z' }),
    ).rejects.toThrow(/duration_minutes or end/);
    expect(store.events.size).toBe(0);
  });

  it('rejects an unknown category', async () => {
    const store = new MemoryStore();
    await expect(
      call(store, 'create_event', {
        title: 'Nope',
        category: 'party',
        start: '2026-03-02T10:00:00Z',
        duration_minutes: 30,
      }),
    ).rejects.toThrow();
    expect(store.events.size).toBe(0);
  });

  it('stores all-day events at local midnight from YYYY-MM-DD', async () => {
    const store = new MemoryStore();
    const res = await call(store, 'create_event', {
      title: 'Company holiday',
      category: 'holiday',
      start: '2026-07-04',
      all_day: true,
    });
    const stored = store.events.get(res.body.event_id)!;
    expect(stored.allDay).toBe(true);
    expect([stored.start.getFullYear(), stored.start.getMonth() + 1, stored.start.getDate()]).toEqual([2026, 7, 4]);
  });
});

describe('list_events', () => {
  it('expands a weekly series into occurrences inside the range', async () => {
    const store = new MemoryStore();
    await call(store, 'create_event', {
      title: 'Standup',
      category: 'meeting',
      start: '2026-03-02T09:00:00Z',
      duration_minutes: 30,
      rrule: { freq: 'weekly', byday: ['MO', 'WE'] },
    });

    const res = await call(store, 'list_events', { from: '2026-03-01', to: '2026-03-15' });
    const dates = res.body.events.map((e: { start: string }) => e.start.slice(0, 10));
    expect(res.body.count).toBeGreaterThanOrEqual(4);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('returns an empty range cleanly', async () => {
    const store = new MemoryStore();
    const res = await call(store, 'list_events', { from: '2030-01-01', to: '2030-01-08' });
    expect(res.body.count).toBe(0);
    expect(res.body.events).toEqual([]);
  });
});

describe('search_events', () => {
  it('matches title, location and notes case-insensitively', async () => {
    const store = new MemoryStore();
    await call(store, 'create_event', {
      title: 'Road trip',
      category: 'travel',
      start: '2026-05-01T08:00:00Z',
      duration_minutes: 480,
      notes: 'Meet at the North Gate',
    });

    expect((await call(store, 'search_events', { query: 'north gate' })).body.count).toBe(1);
    expect((await call(store, 'search_events', { query: 'ROAD' })).body.count).toBe(1);
    expect((await call(store, 'search_events', { query: 'nothing here' })).body.count).toBe(0);
  });
});

describe('delete_events', () => {
  it('previews without deleting, then deletes when confirmed', async () => {
    const store = new MemoryStore();
    const created = await call(store, 'create_event', {
      title: 'Temp',
      category: 'meeting',
      start: '2026-04-01T10:00:00Z',
      duration_minutes: 30,
    });
    const id = created.body.event_id;

    const preview = await call(store, 'delete_events', { ids: [id] });
    expect(preview.body.deleted).toBe(0);
    expect(preview.body.would_delete).toHaveLength(1);
    expect(store.events.has(id)).toBe(true);

    const confirmed = await call(store, 'delete_events', { ids: [id], confirm: true });
    expect(confirmed.body.deleted).toBe(1);
    expect(store.events.has(id)).toBe(false);
    expect(store.audits.at(-1)).toMatchObject({ action: 'delete', eventIds: [id] });
  });

  it('reports ids that do not exist instead of failing', async () => {
    const store = new MemoryStore();
    const res = await call(store, 'delete_events', { ids: ['nope'], confirm: true });
    expect(res.body.deleted).toBe(0);
    expect(res.body.missing).toEqual(['nope']);
  });
});

describe('find_free_slot', () => {
  it('omits slots taken by a busy event', async () => {
    const store = new MemoryStore();
    await call(store, 'create_event', {
      title: 'Workshop',
      category: 'workshop',
      start: '2026-06-10T10:00:00',
      duration_minutes: 120,
    });

    const res = await call(store, 'find_free_slot', { date: '2026-06-10', duration_minutes: 30 });
    const slots: string[] = res.body.free_slots;
    const localTimes = slots.map((s) => {
      const d = new Date(s);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    expect(localTimes.length).toBeGreaterThan(0);
    expect(localTimes).not.toContain('10:00');
    expect(localTimes).not.toContain('11:30');
    expect(localTimes).toContain('08:00');
  });
});

describe('suggest_dates', () => {
  it('ranks a day without events ahead of a busy one', async () => {
    const store = new MemoryStore();
    await call(store, 'create_event', {
      title: 'All day workshop',
      category: 'workshop',
      start: '2026-06-01T09:00:00',
      duration_minutes: 480,
    });

    const res = await call(store, 'suggest_dates', { from: '2026-06-01', count: 3 });
    expect(res.body[0].date).not.toBe('2026-06-01');
    expect(res.body[0].busy_minutes).toBe(0);
  });
});
