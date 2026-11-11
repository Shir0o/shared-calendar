// Firestore <-> CalendarEvent mapping, free of runtime dependencies.
//
// Shared by the Admin-SDK store (Node/stdio) and the REST store (Workers,
// which cannot run firebase-admin). Both emit a `NeutralDoc` of plain Dates
// and let their transport encode timestamps, so the two stores cannot drift.
//
// Mirrors src/lib/events.ts, which cannot be imported here: it pulls in the
// client SDK and its initialized app. EventDocSchema validates what we write,
// so a divergence on required fields fails loudly instead of silently.
import type { CalendarEvent, RRule } from '../../src/lib/calendar';

export interface NeutralRrule {
  freq: RRule['freq'];
  interval?: number;
  byday?: string[];
  count?: number;
  until?: Date;
  exdates?: string[];
}

export interface NeutralDoc {
  title: string;
  cat: string;
  start: Date;
  dur?: number;
  allDay: boolean;
  end?: Date;
  loc?: string;
  notes?: string;
  rrule?: NeutralRrule;
}

function toDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const withToDate = v as { toDate?: () => Date };
  if (typeof withToDate.toDate === 'function') return withToDate.toDate();
  if (typeof v === 'number' || typeof v === 'string') {
    const d = new Date(typeof v === 'number' ? v : v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  // Firestore REST timestamps arrive as { timestampValue: ISO } after decoding.
  const withTimestamp = v as { timestampValue?: string };
  if (typeof withTimestamp.timestampValue === 'string') return new Date(withTimestamp.timestampValue);
  return undefined;
}

export function fromDoc(id: string, data: Record<string, unknown>): CalendarEvent {
  const rruleRaw = data.rrule as (Omit<RRule, 'until'> & { until?: unknown }) | undefined;
  const rrule: RRule | undefined = rruleRaw ? { ...rruleRaw, until: toDate(rruleRaw.until) } : undefined;

  const allDay = Boolean(data.allDay);
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
    title: (data.title as string) ?? 'Untitled event',
    cat: (data.cat as CalendarEvent['cat']) ?? 'meeting',
    start,
    dur: (data.dur as number | undefined) ?? undefined,
    allDay,
    end,
    loc: (data.loc as string) ?? '',
    notes: (data.notes as string) ?? '',
    rrule,
    syncOrigin: data.syncOrigin as CalendarEvent['syncOrigin'],
    gcalFeedId: data.gcalFeedId as string | undefined,
  };
}

export function toNeutralDoc(ev: CalendarEvent): NeutralDoc {
  const rrule: NeutralRrule | undefined = ev.rrule
    ? {
        freq: ev.rrule.freq,
        interval: ev.rrule.interval,
        byday: ev.rrule.byday,
        count: ev.rrule.count,
        until: ev.rrule.until,
        exdates: ev.rrule.exdates,
      }
    : undefined;

  let start = ev.start;
  let end = ev.end;

  if (ev.allDay) {
    start = new Date(Date.UTC(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate()));
    if (ev.end) end = new Date(Date.UTC(ev.end.getFullYear(), ev.end.getMonth(), ev.end.getDate()));
  }

  return {
    title: ev.title,
    cat: ev.cat,
    start,
    dur: ev.dur,
    allDay: ev.allDay ?? false,
    end,
    loc: ev.loc,
    notes: ev.notes,
    rrule,
  };
}
