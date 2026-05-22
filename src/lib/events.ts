// Firestore CRUD + realtime subscription for the shared event collection.
// Maps between Firestore (Timestamps) and the typed CalendarEvent (Date).
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CalendarEvent, RRule } from './calendar';

const COLL = 'events';

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') return new Date(v);
  return undefined;
}

function fromDoc(id: string, data: DocumentData): CalendarEvent {
  const rruleRaw = data.rrule as (Omit<RRule, 'until'> & { until?: unknown }) | undefined;
  const rrule: RRule | undefined = rruleRaw
    ? { ...rruleRaw, until: toDate(rruleRaw.until) }
    : undefined;
  return {
    id,
    title: data.title ?? 'Untitled event',
    cat: data.cat ?? 'meeting',
    start: toDate(data.start) ?? new Date(),
    dur: data.dur ?? undefined,
    allDay: data.allDay ?? false,
    end: toDate(data.end),
    loc: data.loc ?? '',
    notes: data.notes ?? '',
    rrule,
  };
}

// Drop undefined values — Firestore rejects them.
function clean<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function toFirestore(ev: CalendarEvent): Record<string, unknown> {
  const rrule = ev.rrule
    ? clean({
        freq: ev.rrule.freq,
        interval: ev.rrule.interval,
        byday: ev.rrule.byday,
        count: ev.rrule.count,
        exdates: ev.rrule.exdates,
        until: ev.rrule.until ? Timestamp.fromDate(ev.rrule.until) : undefined,
      })
    : undefined;
  return clean({
    title: ev.title,
    cat: ev.cat,
    start: Timestamp.fromDate(ev.start),
    dur: ev.dur,
    allDay: ev.allDay ?? false,
    end: ev.end ? Timestamp.fromDate(ev.end) : undefined,
    loc: ev.loc,
    notes: ev.notes,
    rrule,
  });
}

export function subscribeEvents(cb: (events: CalendarEvent[]) => void, onError?: (e: Error) => void): () => void {
  return onSnapshot(
    collection(db, COLL),
    (snap) => cb(snap.docs.map((d) => fromDoc(d.id, d.data()))),
    (err) => onError?.(err),
  );
}

export async function saveEvent(ev: CalendarEvent): Promise<void> {
  await setDoc(doc(db, COLL, ev.id), toFirestore(ev), { merge: true });
}

export async function removeEvent(id: string): Promise<void> {
  await deleteDoc(doc(db, COLL, id));
}
