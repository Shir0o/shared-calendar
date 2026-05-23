// Pure calendar domain logic for the shared event calendar.
// Ported from the Lattice design prototype (data.jsx), fully typed, no globals.
//
// This is a *shared workspace* calendar — anyone with access sees and edits the
// same events. There is no per-person availability; events have NO attendees.
// Conflicts are detected event-vs-event, not person-vs-person.

export type CategoryId =
  | 'product'
  | 'meeting'
  | 'social'
  | 'workshop'
  | 'deadline'
  | 'travel'
  | 'holiday';

export interface Category {
  id: CategoryId;
  label: string;
  hue: number;
  dot: string;
  soft: string;
  ink: string;
}

export type Freq = 'daily' | 'weekly' | 'monthly';

export interface RRule {
  freq: Freq;
  interval?: number;
  byday?: string[]; // SU MO TU WE TH FR SA
  until?: Date;
  count?: number;
  exdates?: string[]; // ISO yyyy-mm-dd
}

export interface CalendarEvent {
  id: string;
  title: string;
  cat: CategoryId;
  start: Date;
  dur?: number; // minutes (timed events)
  allDay?: boolean;
  end?: Date; // exclusive end for all-day / multi-day spans
  loc?: string;
  notes?: string;
  rrule?: RRule;
  // Set on expanded recurrence instances (never persisted):
  __seriesId?: string;
  __instanceDate?: string;
}

// Per-category chroma values were tuned individually in the defaults below
// (e.g. holiday uses chroma 0.02 for a neutral grey). When the user picks a
// custom hue we re-derive dot/soft/ink with a single shared formula so the
// pickers stay simple — exact recreation of the per-category chroma is sacrificed
// for editability. Defaults are preserved verbatim and used as the reset target.
export function tokensForHue(hue: number): { dot: string; soft: string; ink: string } {
  const h = ((hue % 360) + 360) % 360;
  return {
    dot: `oklch(0.62 0.14 ${h})`,
    soft: `oklch(0.95 0.04 ${h})`,
    ink: `oklch(0.34 0.12 ${h})`,
  };
}

export const DEFAULT_CATEGORIES: readonly Category[] = Object.freeze([
  Object.freeze({ id: 'product' as CategoryId, label: 'Product', hue: 240, dot: 'oklch(0.62 0.15 240)', soft: 'oklch(0.95 0.04 240)', ink: 'oklch(0.32 0.13 240)' }),
  Object.freeze({ id: 'meeting' as CategoryId, label: 'Meeting', hue: 200, dot: 'oklch(0.62 0.13 200)', soft: 'oklch(0.95 0.035 200)', ink: 'oklch(0.32 0.11 200)' }),
  Object.freeze({ id: 'social' as CategoryId, label: 'Social', hue: 150, dot: 'oklch(0.62 0.13 150)', soft: 'oklch(0.95 0.04 150)', ink: 'oklch(0.34 0.11 150)' }),
  Object.freeze({ id: 'workshop' as CategoryId, label: 'Workshop', hue: 300, dot: 'oklch(0.62 0.14 300)', soft: 'oklch(0.95 0.04 300)', ink: 'oklch(0.34 0.13 300)' }),
  Object.freeze({ id: 'deadline' as CategoryId, label: 'Deadline', hue: 28, dot: 'oklch(0.62 0.16 28)', soft: 'oklch(0.95 0.05 28)', ink: 'oklch(0.36 0.14 28)' }),
  Object.freeze({ id: 'travel' as CategoryId, label: 'Travel', hue: 85, dot: 'oklch(0.65 0.13 85)', soft: 'oklch(0.95 0.045 85)', ink: 'oklch(0.36 0.12 85)' }),
  Object.freeze({ id: 'holiday' as CategoryId, label: 'Holiday', hue: 0, dot: 'oklch(0.65 0.02 0)', soft: 'oklch(0.95 0.005 0)', ink: 'oklch(0.40 0.01 0)' }),
]);

// CATEGORIES and CAT_BY_ID are intentionally mutable: src/lib/categories.ts
// rewrites their entries in place when the owner edits a category's label or
// hue. The bindings never change shape (same 7 IDs in the same order); only
// the label/color fields on each entry. Re-renders are driven by a separate
// `useCategoryVersion()` hook so React sees the change.
export const CATEGORIES: Category[] = DEFAULT_CATEGORIES.map((c) => ({ ...c }));

export const CAT_BY_ID: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

// ─── Date helpers ────────────────────────────────────────────────────────────
export const MS_DAY = 24 * 60 * 60 * 1000;

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const BYDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export const BYDAY_LABEL: Record<string, string> = { SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat' };

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day - weekStartsOn + 7) % 7));
  return d;
}
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
export function monthGrid(date: Date, weekStartsOn = 1): Date[] {
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first, weekStartsOn);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
  return cells;
}
export function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'p' : 'a';
  h = h % 12 || 12;
  return m === 0 ? `${h}${ap}` : `${h}:${String(m).padStart(2, '0')}${ap}`;
}
export function fmtTimeFull(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}
export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
export function fmtDateLong(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Event helpers ──────────────────────────────────────────────────────────
export function eventEnd(ev: CalendarEvent): Date {
  if (ev.end) return ev.end;
  if (ev.allDay) return addDays(ev.start, 1);
  return new Date(ev.start.getTime() + (ev.dur || 30) * 60000);
}
export function eventOnDay(ev: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const evStart = ev.allDay ? startOfDay(ev.start) : ev.start;
  const evEnd = eventEnd(ev);
  return evStart < dayEnd && evEnd > dayStart;
}
export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => eventOnDay(e, day));
}
export function eventSpanDays(ev: CalendarEvent): number {
  const s = startOfDay(ev.start);
  const e = startOfDay(eventEnd(ev));
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / MS_DAY));
}

// ─── Recurrence expansion ───────────────────────────────────────────────────
export function expandEvent(ev: CalendarEvent, rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  if (!ev.rrule) {
    if (eventEnd(ev) > rangeStart && ev.start < rangeEnd) return [ev];
    return [];
  }
  const r = ev.rrule;
  const out: CalendarEvent[] = [];
  const exdates = new Set(r.exdates || []);
  const interval = Math.max(1, r.interval || 1);
  const until = r.until ? new Date(r.until) : null;
  const dur = ev.dur || 60;
  const seriesStart = startOfDay(ev.start);

  const walkStart = startOfDay(rangeStart < seriesStart ? seriesStart : rangeStart);
  let cur = new Date(walkStart);
  const stop = until && until < rangeEnd ? addDays(startOfDay(until), 1) : rangeEnd;

  let produced = 0;
  let safety = 1000;
  const cap = r.count || 9999;

  while (cur < stop && produced < cap && safety-- > 0) {
    let include = false;
    if (r.freq === 'daily') {
      const diff = Math.floor((cur.getTime() - seriesStart.getTime()) / MS_DAY);
      include = diff >= 0 && diff % interval === 0;
    } else if (r.freq === 'weekly') {
      const weeksFromStart = Math.floor((startOfWeek(cur, 1).getTime() - startOfWeek(seriesStart, 1).getTime()) / (7 * MS_DAY));
      if (weeksFromStart >= 0 && weeksFromStart % interval === 0) {
        const dow = BYDAY_CODES[cur.getDay()];
        if (r.byday && r.byday.length) include = r.byday.includes(dow);
        else include = cur.getDay() === seriesStart.getDay();
      }
    } else if (r.freq === 'monthly') {
      // Clamp the target day-of-month to the last day of shorter months so an
      // event on the 31st still lands on Feb 28/29, Apr 30, etc.
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const targetDay = seriesStart.getDate();
      if (cur.getDate() === Math.min(targetDay, lastDay)) {
        const monthsFromStart = (cur.getFullYear() - seriesStart.getFullYear()) * 12 + (cur.getMonth() - seriesStart.getMonth());
        include = monthsFromStart >= 0 && monthsFromStart % interval === 0;
      }
    }

    if (include) {
      const iso = isoDate(cur);
      if (!exdates.has(iso)) {
        const inst = new Date(cur);
        inst.setHours(ev.start.getHours(), ev.start.getMinutes(), 0, 0);
        out.push({
          ...ev,
          id: ev.id + '#' + iso,
          start: inst,
          dur,
          __seriesId: ev.id,
          __instanceDate: iso,
        });
        produced++;
      }
    }
    cur = addDays(cur, 1);
  }
  return out;
}

export function expandEvents(events: CalendarEvent[], rangeStart: Date, rangeEnd: Date): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const ev of events) {
    for (const inst of expandEvent(ev, rangeStart, rangeEnd)) out.push(inst);
  }
  return out;
}

export function rruleSummary(rrule?: RRule): string {
  if (!rrule) return '';
  const i = rrule.interval || 1;
  if (rrule.freq === 'daily') return i === 1 ? 'Repeats daily' : `Repeats every ${i} days`;
  if (rrule.freq === 'weekly') {
    const days = (rrule.byday || []).map((c) => BYDAY_LABEL[c]).join(', ');
    if (days) return i === 1 ? `Repeats weekly on ${days}` : `Repeats every ${i} weeks on ${days}`;
    return i === 1 ? 'Repeats weekly' : `Repeats every ${i} weeks`;
  }
  if (rrule.freq === 'monthly') return i === 1 ? 'Repeats monthly' : `Repeats every ${i} months`;
  return 'Repeats';
}

// ─── Conflict detection ─────────────────────────────────────────────────────
export function isConflictable(ev: CalendarEvent): boolean {
  return !ev.allDay && ev.cat !== 'deadline' && ev.cat !== 'holiday' && (ev.dur || 0) > 0;
}
export function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  if (!isConflictable(a) || !isConflictable(b)) return false;
  const as = a.start.getTime(), ae = eventEnd(a).getTime();
  const bs = b.start.getTime(), be = eventEnd(b).getTime();
  return as < be && ae > bs;
}
export function conflictsForEvent(ev: CalendarEvent, allEvents: CalendarEvent[]): CalendarEvent[] {
  if (!isConflictable(ev)) return [];
  return allEvents.filter((o) => o.id !== ev.id && eventsOverlap(ev, o));
}
export function conflictMap(allEvents: CalendarEvent[]): Map<string, number> {
  const m = new Map<string, number>();
  const list = allEvents.filter(isConflictable);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (eventsOverlap(list[i], list[j])) {
        m.set(list[i].id, (m.get(list[i].id) || 0) + 1);
        m.set(list[j].id, (m.get(list[j].id) || 0) + 1);
      }
    }
  }
  return m;
}

// ─── Smart suggestions ──────────────────────────────────────────────────────
export interface DateSuggestion {
  date: Date;
  count: number;
  busyMins: number;
}

export function suggestDates(
  from: Date,
  _dur: number,
  events: CalendarEvent[],
  n = 4,
  includeWeekends = false,
): DateSuggestion[] {
  const start = startOfDay(from);
  const horizonEnd = addDays(start, 35);
  const expanded = expandEvents(events, start, horizonEnd);
  const out: DateSuggestion[] = [];
  for (let i = 0; i < 28; i++) {
    const day = addDays(start, i);
    const dow = day.getDay();
    if (!includeWeekends && (dow === 0 || dow === 6)) continue;
    const list = eventsForDay(expanded, day).filter(isConflictable);
    const dayStart = new Date(day);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(18, 0, 0, 0);
    let busy = 0;
    for (const ev of list) {
      const s = Math.max(ev.start.getTime(), dayStart.getTime());
      const e = Math.min(eventEnd(ev).getTime(), dayEnd.getTime());
      if (e > s) busy += (e - s) / 60000;
    }
    out.push({ date: day, count: list.length, busyMins: busy });
  }
  out.sort((a, b) => a.busyMins - b.busyMins || a.count - b.count || a.date.getTime() - b.date.getTime());
  return out.slice(0, n);
}

export interface SlotSuggestion {
  h: number;
  m: number;
  conflicts: number;
  conflictEvents: CalendarEvent[];
}

export function suggestSlots(date: Date, dur: number, events: CalendarEvent[]): SlotSuggestion[] {
  const expanded = expandEvents(events, addDays(date, -1), addDays(date, 2));
  const day = startOfDay(date);
  const slots: SlotSuggestion[] = [];
  for (let h = 8; h < 18; h++) {
    for (const m of [0, 30]) {
      const slotStart = new Date(day);
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + dur * 60000);
      if (slotEnd.getHours() > 19 || (slotEnd.getHours() === 19 && slotEnd.getMinutes() > 0)) continue;
      const conflicts = expanded.filter(
        (e) => isConflictable(e) && sameDay(e.start, day) && e.start < slotEnd && eventEnd(e) > slotStart,
      );
      slots.push({ h, m, conflicts: conflicts.length, conflictEvents: conflicts });
    }
  }
  return slots;
}
