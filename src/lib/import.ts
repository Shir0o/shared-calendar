// Bulk-import parsing: turn an .ics file or pasted text/CSV/TSV into reviewable
// CalendarEvent candidates. Pure (no Firestore) so it can be unit-tested.
import ICAL from 'ical.js';
import { CATEGORIES, type CalendarEvent, type CategoryId, type Freq, type RRule } from './calendar';

export interface ImportCandidate {
  event: CalendarEvent; // fresh crypto.randomUUID() id
  include: boolean; // preview checkbox; defaults to !errors.length
  errors: string[]; // hard failures — excluded from commit
  warnings: string[]; // soft notes — still importable
}

// ─── Category matching ───────────────────────────────────────────────────────
// Match free-text (a column value, or an ICS category) against known categories.
export function matchCategory(raw?: string): CategoryId {
  if (!raw) return 'meeting';
  const t = raw.trim().toLowerCase();
  const hit = CATEGORIES.find((c) => c.id === t || c.label.toLowerCase() === t);
  return hit ? hit.id : 'meeting';
}

function newId(): string {
  return crypto.randomUUID();
}

// ─── ICS (.ics / iCalendar) ──────────────────────────────────────────────────
const SUPPORTED_FREQ: Record<string, Freq> = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' };

type Recur = InstanceType<typeof ICAL.Recur>;

function mapRRule(recur: Recur, warnings: string[]): RRule | undefined {
  const freq = SUPPORTED_FREQ[recur.freq];
  if (!freq) {
    warnings.push(`Recurrence "${recur.freq}" not supported — imported as a single event.`);
    return undefined;
  }
  const out: RRule = { freq };
  if (recur.interval && recur.interval > 1) out.interval = recur.interval;
  if (recur.count) out.count = recur.count;
  if (recur.until) out.until = recur.until.toJSDate();
  const byday = recur.getComponent('BYDAY');
  if (byday && byday.length) out.byday = byday as string[];
  return out;
}

// Parse an iCalendar string. Throws on a malformed file (caller shows the error).
export function parseICS(text: string): ImportCandidate[] {
  const jcal = ICAL.parse(text); // throws on malformed input
  const root = new ICAL.Component(jcal);
  // A bare VEVENT (no enclosing VCALENDAR) parses as the root component itself.
  const vevents = root.name === 'vevent' ? [root] : root.getAllSubcomponents('vevent');

  return vevents.map((ve) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const ev = new ICAL.Event(ve);

    const title = (ev.summary || '').trim() || 'Untitled event';
    const startTime = ev.startDate;
    const endTime = ev.endDate;

    let start = new Date();
    let allDay = false;
    let dur: number | undefined;
    let end: Date | undefined;

    if (!startTime) {
      errors.push('Missing start date.');
    } else {
      allDay = startTime.isDate;
      start = startTime.toJSDate();
      if (allDay) {
        // ICS DTEND for all-day events is already exclusive.
        if (endTime) end = endTime.toJSDate();
        dur = 0;
      } else if (endTime) {
        const mins = Math.round((endTime.toJSDate().getTime() - start.getTime()) / 60000);
        dur = mins > 0 ? mins : 60;
      } else {
        dur = 60;
      }
    }

    let rrule: RRule | undefined;
    if (ev.isRecurring()) {
      const recur = ve.getFirstPropertyValue('rrule') as Recur | null;
      if (recur) rrule = mapRRule(recur, warnings);
    }

    const event: CalendarEvent = {
      id: newId(),
      title,
      cat: matchCategory(ve.getFirstPropertyValue('categories') as string | undefined),
      start,
      allDay,
      dur,
      end,
      loc: (ev.location || '').trim() || undefined,
      notes: (ev.description || '').trim() || undefined,
      rrule,
    };

    return { event, include: errors.length === 0, errors, warnings };
  });
}

// ─── Delimited text (CSV / TSV / Sheets paste) ───────────────────────────────
const HEADER_ALIASES: Record<string, keyof Row> = {
  title: 'title', name: 'title', event: 'title', summary: 'title',
  date: 'date', day: 'date', when: 'date',
  start: 'start', 'start time': 'start', time: 'start',
  end: 'end', 'end time': 'end', duration: 'end', dur: 'end',
  category: 'cat', cat: 'cat', type: 'cat',
  location: 'loc', loc: 'loc', place: 'loc', where: 'loc',
  notes: 'notes', note: 'notes', description: 'notes', desc: 'notes',
};
const FIXED_ORDER: (keyof Row)[] = ['title', 'date', 'start', 'end', 'cat', 'loc', 'notes'];

interface Row {
  title?: string;
  date?: string;
  start?: string;
  end?: string;
  cat?: string;
  loc?: string;
  notes?: string;
}

// Split a delimited line, honoring double-quoted fields so commas/tabs inside
// quotes don't split (e.g. `"Meeting, with boss",2026-06-03,…`). Escaped
// quotes inside a quoted field follow CSV convention: `""` → `"`.
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

// Lenient date parse: ISO (YYYY-MM-DD), US (M/D/YYYY or M/D/YY), or anything
// the JS Date parser handles (e.g. "Jun 3 2026"). Returns local midnight.
function parseDate(s: string): Date | null {
  const t = s.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(t);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return new Date(y, +m[1] - 1, +m[2]);
  }
  const d = new Date(t);
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return null;
}

// Parse a clock time like "14:00", "2:00 PM", "2pm", "9:30am". Returns {h,m}.
function parseTime(s: string): { h: number; m: number } | null {
  const t = s.trim().toLowerCase();
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(t);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  const ap = m[3];
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

// Parse the "end" column as either an end clock time, a minute count ("90"),
// or a duration string ("1h", "90m", "1h30m"). Returns minutes given a start.
function parseDuration(s: string, start: Date | null): number | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  // Plain number → minutes.
  if (/^\d+$/.test(t)) return +t;
  // Duration like 1h, 90m, 1h30m.
  const dm = /^(?:(\d+)h)?\s*(?:(\d+)m)?$/.exec(t);
  if (dm && (dm[1] || dm[2])) return (+(dm[1] || 0)) * 60 + +(dm[2] || 0);
  // Otherwise treat as an end clock time.
  const end = parseTime(t);
  if (end && start) {
    const mins = end.h * 60 + end.m - (start.getHours() * 60 + start.getMinutes());
    if (mins > 0) return mins;
  }
  return null;
}

export function parseDelimited(text: string): ImportCandidate[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const delim = lines[0].includes('\t') ? '\t' : ',';

  // Detect a header row by checking whether the first row's cells are all aliases.
  const firstCells = splitLine(lines[0], delim).map((c) => c.toLowerCase());
  const looksLikeHeader = firstCells.some((c) => c === 'title' || c === 'name' || c === 'event');
  let colMap: (keyof Row | null)[];
  let dataLines: string[];
  if (looksLikeHeader) {
    colMap = firstCells.map((c) => HEADER_ALIASES[c] ?? null);
    dataLines = lines.slice(1);
  } else {
    colMap = FIXED_ORDER;
    dataLines = lines;
  }

  return dataLines.map((line) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const cells = splitLine(line, delim);
    const row: Row = {};
    cells.forEach((val, i) => {
      const key = colMap[i];
      if (key && val) row[key] = val;
    });

    const title = (row.title || '').trim();
    if (!title) errors.push(`Missing title — "${line}"`);

    const date = row.date ? parseDate(row.date) : null;
    if (!date) errors.push(`Unrecognized date "${row.date ?? ''}" — "${line}"`);

    let start = date ?? new Date();
    let allDay = true;
    let dur: number | undefined = 0;

    if (date && row.start) {
      const t = parseTime(row.start);
      if (t) {
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), t.h, t.m);
        allDay = false;
        dur = 60;
        if (row.end) {
          const d = parseDuration(row.end, start);
          if (d) dur = d;
          else warnings.push(`Couldn't read end/duration "${row.end}" — defaulted to 60m.`);
        }
      } else {
        warnings.push(`Couldn't read start time "${row.start}" — treated as all-day.`);
      }
    }

    const event: CalendarEvent = {
      id: newId(),
      title: title || 'Untitled event',
      cat: matchCategory(row.cat),
      start,
      allDay,
      dur,
      end: allDay && date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) : undefined,
      loc: row.loc || undefined,
      notes: row.notes || undefined,
    };

    return { event, include: errors.length === 0, errors, warnings };
  });
}
