/**
 * In-memory CalendarStore.
 *
 * Used by unit tests and by `MCP_BACKEND=memory` (offline stdio smoke checks)
 * so the tool layer can be exercised with no Firebase credentials and no network.
 */
import type { CalendarEvent } from '../../src/lib/calendar';
import type { AuditEntry, CalendarStore, EventInput, EventPatch } from './types';

export class MemoryStore implements CalendarStore {
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
