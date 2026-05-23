// Server-side ICS → event mapping. Mirrors src/lib/import.ts's parseICS but
// returns plain-data objects (Date, no Firestore types) so index.ts can
// serialize with admin SDK Timestamps.
import ICAL from 'ical.js';

export type Freq = 'daily' | 'weekly' | 'monthly';

export interface ParsedRRule {
  freq: Freq;
  interval?: number;
  byday?: string[];
  until?: Date;
  count?: number;
}

export interface ParsedEvent {
  uid: string; // ICS UID — the stable identity for upsert/delete tracking
  title: string;
  cat: 'meeting'; // ICS doesn't reliably carry our category; default
  start: Date;
  allDay: boolean;
  dur?: number; // minutes
  end?: Date;
  loc?: string;
  notes?: string;
  rrule?: ParsedRRule;
}

const SUPPORTED_FREQ: Record<string, Freq> = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' };
type Recur = InstanceType<typeof ICAL.Recur>;

function mapRRule(recur: Recur): ParsedRRule | undefined {
  const freq = SUPPORTED_FREQ[recur.freq];
  if (!freq) return undefined;
  const out: ParsedRRule = { freq };
  if (recur.interval && recur.interval > 1) out.interval = recur.interval;
  if (recur.count) out.count = recur.count;
  if (recur.until) out.until = recur.until.toJSDate();
  const byday = recur.getComponent('BYDAY');
  if (byday && byday.length) out.byday = byday as string[];
  return out;
}

export function eventsFromIcs(text: string): ParsedEvent[] {
  const jcal = ICAL.parse(text);
  const root = new ICAL.Component(jcal);
  const vevents = root.name === 'vevent' ? [root] : root.getAllSubcomponents('vevent');

  const out: ParsedEvent[] = [];
  for (const ve of vevents) {
    const ev = new ICAL.Event(ve);
    const uid = ev.uid;
    if (!uid || !ev.startDate) continue;

    const allDay = ev.startDate.isDate;
    const start = ev.startDate.toJSDate();
    let dur: number | undefined;
    let end: Date | undefined;
    if (allDay) {
      if (ev.endDate) end = ev.endDate.toJSDate();
      dur = 0;
    } else if (ev.endDate) {
      const m = Math.round((ev.endDate.toJSDate().getTime() - start.getTime()) / 60000);
      dur = m > 0 ? m : 60;
    } else {
      dur = 60;
    }

    let rrule: ParsedRRule | undefined;
    if (ev.isRecurring()) {
      const recur = ve.getFirstPropertyValue('rrule') as Recur | null;
      if (recur) rrule = mapRRule(recur);
    }

    out.push({
      uid,
      title: (ev.summary || 'Untitled event').trim(),
      cat: 'meeting',
      start,
      allDay,
      dur,
      end,
      loc: (ev.location || '').trim() || undefined,
      notes: (ev.description || '').trim() || undefined,
      rrule,
    });
  }
  return out;
}

// Stable, deterministic doc ID for a (feedId, ICS UID) pair. FNV-1a 64-bit on
// each half — keeping them in separate hash segments means the same UID in two
// feeds maps to different doc IDs (rare but possible).
function fnv1a64(s: string): string {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < s.length; i++) {
    h = (h ^ BigInt(s.charCodeAt(i))) & 0xffffffffffffffffn;
    h = (h * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

export function docIdForFeed(feedId: string, uid: string): string {
  return `gcal_${fnv1a64(feedId)}_${fnv1a64(uid)}`;
}
