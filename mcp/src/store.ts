// Admin-SDK store, for the stdio transport (Claude Code / Desktop).
//
// The Admin SDK bypasses firestore.rules, which is required (an MCP client has
// no signed-in Firebase user) and is why the tool set is deliberately narrow
// and every write is audited. The Worker uses the REST store instead.
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import type { CalendarEvent } from '../../src/lib/calendar';
import { EventDocSchema } from '../../shared/schemas';
import { fromDoc, toNeutralDoc } from './map';
import type { AuditEntry, CalendarStore, EventInput, EventPatch } from './types';

const COLL = 'events';
const AUDIT_COLL = 'auditLog';

function clean<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/** NeutralDoc → Firestore document with admin Timestamps. */
export function toDoc(ev: CalendarEvent): Record<string, unknown> {
  const doc = toNeutralDoc(ev);
  return clean({
    title: doc.title,
    cat: doc.cat,
    start: Timestamp.fromDate(doc.start),
    dur: doc.dur,
    allDay: doc.allDay,
    end: doc.end ? Timestamp.fromDate(doc.end) : undefined,
    loc: doc.loc,
    notes: doc.notes,
    rrule: doc.rrule
      ? clean({
          freq: doc.rrule.freq,
          interval: doc.rrule.interval,
          byday: doc.rrule.byday,
          count: doc.rrule.count,
          exdates: doc.rrule.exdates,
          until: doc.rrule.until ? Timestamp.fromDate(doc.rrule.until) : undefined,
        })
      : undefined,
  });
}

export class FirestoreStore implements CalendarStore {
  private readonly db: Firestore;

  constructor(projectId: string) {
    if (getApps().length === 0) {
      initializeApp({ credential: applicationDefault(), projectId });
    }
    this.db = getFirestore();
  }

  async listEvents(): Promise<CalendarEvent[]> {
    const snap = await this.db.collection(COLL).get();
    return snap.docs.map((d) => fromDoc(d.id, d.data() as DocumentData));
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    const snap = await this.db.collection(COLL).doc(id).get();
    return snap.exists ? fromDoc(snap.id, (snap.data() ?? {}) as DocumentData) : null;
  }

  async createEvent(input: EventInput): Promise<string> {
    const ref = this.db.collection(COLL).doc();
    const payload = EventDocSchema.parse(toDoc({ id: ref.id, ...input }));
    await ref.set(payload);
    return ref.id;
  }

  async updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent> {
    const current = await this.getEvent(id);
    if (!current) throw new Error(`No event with id ${id}`);
    const merged: CalendarEvent = { ...current, ...patch, start: patch.start ?? current.start };
    const payload = EventDocSchema.parse(toDoc(merged));
    await this.db.collection(COLL).doc(id).set(payload);
    return merged;
  }

  async deleteEvents(ids: string[]): Promise<number> {
    const batch = this.db.batch();
    for (const id of ids) batch.delete(this.db.collection(COLL).doc(id));
    await batch.commit();
    return ids.length;
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    await this.db.collection(AUDIT_COLL).add({ ...entry, at: FieldValue.serverTimestamp() });
  }
}
