// The calendar tool set, in one place.
//
// Both transports (stdio for Claude Code/Desktop, HTTP for the claude.ai
// connector) register these same definitions, so behaviour cannot drift
// between them.
//
// Every tool parses its own input with its zod schema. The MCP SDK has already
// validated it; parsing again is what gives the handlers real types without
// `any`, and keeps the tools testable with no server attached.
import { z } from 'zod';
import {
  DEFAULT_CATEGORIES,
  addDays,
  expandEvents,
  rruleSummary,
  startOfDay,
  suggestDates,
  suggestSlots,
  type CalendarEvent,
  type RRule,
} from '../../src/lib/calendar';
import type { EventInput, EventPatch, ToolDef, ToolResult } from './types';

const CATEGORY_IDS = ['product', 'meeting', 'social', 'workshop', 'deadline', 'travel', 'holiday'] as const;
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

const Category = z.enum(CATEGORY_IDS);
const RRuleSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().positive().optional(),
  byday: z.array(z.enum(BYDAY)).optional().describe('Weekday codes, SU..SA'),
  count: z.number().int().positive().optional(),
  until: z.string().optional().describe('ISO date/datetime after which the series stops'),
  exdates: z.array(z.string()).optional().describe('ISO dates to skip'),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDateTime(value: string, field: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`${field} is not a valid ISO date/time: ${value}`);
  return d;
}

/** 'YYYY-MM-DD' → local midnight, matching how the UI stores all-day events. */
function parseDateOnly(value: string, field: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) throw new Error(`${field} must be YYYY-MM-DD for all-day events: ${value}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toRRule(input: z.infer<typeof RRuleSchema> | undefined): RRule | undefined {
  if (!input) return undefined;
  return {
    freq: input.freq,
    interval: input.interval,
    byday: input.byday,
    count: input.count,
    until: input.until ? parseDateTime(input.until, 'rrule.until') : undefined,
    exdates: input.exdates,
  };
}

function json(value: unknown): ToolResult {
  return { text: JSON.stringify(value, null, 2) };
}

function fail(message: string): ToolResult {
  return { text: message, isError: true };
}

function serializeEvent(ev: CalendarEvent) {
  return {
    event_id: ev.id,
    instance_date: ev.__instanceDate,
    title: ev.title,
    category: ev.cat,
    start: ev.start.toISOString(),
    end: ev.end?.toISOString(),
    all_day: ev.allDay ?? false,
    duration_minutes: ev.dur,
    location: ev.loc || undefined,
    notes: ev.notes || undefined,
    recurrence: ev.rrule ? rruleSummary(ev.rrule) : undefined,
    google_calendar: ev.syncOrigin === 'gcal',
  };
}

function sortByStart(a: CalendarEvent, b: CalendarEvent): number {
  return a.start.getTime() - b.start.getTime();
}

function buildEventInput(input: {
  title: string;
  category: CalendarEvent['cat'];
  start: string;
  all_day?: boolean;
  duration_minutes?: number;
  end?: string;
  location?: string;
  notes?: string;
  rrule?: z.infer<typeof RRuleSchema>;
}): EventInput {
  const allDay = input.all_day ?? false;
  const start = allDay ? parseDateOnly(input.start, 'start') : parseDateTime(input.start, 'start');
  const end = input.end
    ? allDay
      ? parseDateOnly(input.end, 'end')
      : parseDateTime(input.end, 'end')
    : undefined;

  if (end && end.getTime() < start.getTime()) throw new Error('end is before start');
  if (!allDay && input.duration_minutes === undefined && !end) {
    throw new Error('timed events need duration_minutes or end');
  }

  return {
    title: input.title,
    cat: input.category,
    start,
    allDay,
    dur: allDay ? undefined : input.duration_minutes,
    end,
    loc: input.location,
    notes: input.notes,
    rrule: toRRule(input.rrule),
  };
}

/** Human summary of a patch, for the audit log. */
function describePatch(patch: EventPatch): string {
  const keys = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== undefined);
  return keys.length ? `changed ${keys.join(', ')}` : 'no fields changed';
}

// ─── Tools ──────────────────────────────────────────────────────────────────

const listEvents: ToolDef = {
  name: 'list_events',
  title: 'List events in a date range',
  description:
    'List calendar events overlapping a date range, with recurring events expanded into individual occurrences. ' +
    'All-day, multi-day, deadline, holiday and travel events are included. Use this before answering anything about the schedule.',
  inputSchema: {
    from: z.string().optional().describe('ISO start of range. Defaults to the start of today.'),
    to: z.string().optional().describe('ISO end of range (exclusive). Defaults to 30 days after `from`.'),
    limit: z.number().int().positive().max(500).optional().describe('Max occurrences to return. Default 200.'),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, args) {
    const input = z
      .object({ from: z.string().optional(), to: z.string().optional(), limit: z.number().int().positive().max(500).optional() })
      .parse(args);
    const from = input.from ? parseDateTime(input.from, 'from') : startOfDay(new Date());
    const to = input.to ? parseDateTime(input.to, 'to') : addDays(from, 30);
    if (to <= from) return fail('`to` must be after `from`');

    const all = await ctx.store.listEvents();
    const limit = input.limit ?? 200;
    const occurrences = expandEvents(all, addDays(from, -1), to)
      .filter((ev) => {
        const end = ev.end ?? new Date(ev.start.getTime() + (ev.dur || 0) * 60000);
        return ev.start < to && end > from;
      })
      .sort(sortByStart)
      .slice(0, limit);

    return json({ from: from.toISOString(), to: to.toISOString(), count: occurrences.length, events: occurrences.map(serializeEvent) });
  },
};

const searchEvents: ToolDef = {
  name: 'search_events',
  title: 'Search events by text',
  description:
    'Search the whole calendar (past and future) by title, location or notes. Returns series, not expanded occurrences.',
  inputSchema: {
    query: z.string().min(1),
    limit: z.number().int().positive().max(100).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, args) {
    const input = z.object({ query: z.string().min(1), limit: z.number().int().positive().max(100).optional() }).parse(args);
    const needle = input.query.toLowerCase();
    const hits = (await ctx.store.listEvents())
      .filter((ev) => [ev.title, ev.loc, ev.notes].some((t) => (t ?? '').toLowerCase().includes(needle)))
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .slice(0, input.limit ?? 20);

    return json({ query: input.query, count: hits.length, events: hits.map(serializeEvent) });
  },
};

const getEvent: ToolDef = {
  name: 'get_event',
  title: 'Get one event',
  description: 'Fetch a single event document by id, including its recurrence rule.',
  inputSchema: { id: z.string().min(1) },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, args) {
    const { id } = z.object({ id: z.string().min(1) }).parse(args);
    const ev = await ctx.store.getEvent(id);
    if (!ev) return fail(`No event with id ${id}`);
    return json({ ...serializeEvent(ev), rrule: ev.rrule ?? null });
  },
};

const listCategories: ToolDef = {
  name: 'list_categories',
  title: 'List event categories',
  description: 'The seven permitted event categories. `create_event.category` must be one of these ids.',
  inputSchema: {},
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run() {
    return json(DEFAULT_CATEGORIES.map((c) => ({ id: c.id, label: c.label })));
  },
};

const createEvent: ToolDef = {
  name: 'create_event',
  title: 'Create an event',
  description:
    'Create an event on the shared calendar. Timed events need `duration_minutes` (or `end`); all-day events use `all_day: true` with YYYY-MM-DD dates. ' +
    'Overlaps with existing events are allowed and are not errors.',
  inputSchema: {
    title: z.string().min(1),
    category: Category,
    start: z.string().describe('ISO datetime, or YYYY-MM-DD when all_day is true'),
    duration_minutes: z.number().int().positive().max(24 * 60).optional(),
    all_day: z.boolean().optional(),
    end: z.string().optional().describe('Exclusive end for all-day / multi-day events'),
    location: z.string().optional(),
    notes: z.string().optional(),
    rrule: RRuleSchema.optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  async run(ctx, args) {
    const input = z
      .object({
        title: z.string().min(1),
        category: Category,
        start: z.string(),
        duration_minutes: z.number().int().positive().max(24 * 60).optional(),
        all_day: z.boolean().optional(),
        end: z.string().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        rrule: RRuleSchema.optional(),
      })
      .parse(args);

    const ev = buildEventInput(input);
    const id = await ctx.store.createEvent(ev);
    await ctx.store.appendAudit({
      actor: ctx.actor,
      action: 'create',
      eventIds: [id],
      summary: `created "${ev.title}" at ${ev.start.toISOString()}`,
    });
    return json({ ok: true, event_id: id, event: serializeEvent({ id, ...ev }) });
  },
};

const updateEvent: ToolDef = {
  name: 'update_event',
  title: 'Update an event',
  description:
    'Update fields on an existing event. Only the fields you pass change. ' +
    'Updating a recurring series changes the series, not a single occurrence.',
  inputSchema: {
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    category: Category.optional(),
    start: z.string().optional(),
    duration_minutes: z.number().int().positive().max(24 * 60).optional(),
    all_day: z.boolean().optional(),
    end: z.string().nullable().optional().describe('null clears the end date'),
    location: z.string().optional(),
    notes: z.string().optional(),
    rrule: RRuleSchema.nullable().optional().describe('null clears the recurrence'),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  async run(ctx, args) {
    const input = z
      .object({
        id: z.string().min(1),
        title: z.string().min(1).optional(),
        category: Category.optional(),
        start: z.string().optional(),
        duration_minutes: z.number().int().positive().max(24 * 60).optional(),
        all_day: z.boolean().optional(),
        end: z.string().nullable().optional(),
        location: z.string().optional(),
        notes: z.string().optional(),
        rrule: RRuleSchema.nullable().optional(),
      })
      .parse(args);

    const current = await ctx.store.getEvent(input.id);
    if (!current) return fail(`No event with id ${input.id}`);

    const allDay = input.all_day ?? current.allDay ?? false;
    const patch: EventPatch = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.category !== undefined) patch.cat = input.category;
    if (input.all_day !== undefined) patch.allDay = input.all_day;
    if (input.start !== undefined) {
      patch.start = allDay ? parseDateOnly(input.start, 'start') : parseDateTime(input.start, 'start');
    }
    if (input.duration_minutes !== undefined) patch.dur = input.duration_minutes;
    if (input.end !== undefined) {
      patch.end = input.end === null ? undefined : allDay ? parseDateOnly(input.end, 'end') : parseDateTime(input.end, 'end');
    }
    if (input.location !== undefined) patch.loc = input.location;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.rrule !== undefined) patch.rrule = input.rrule === null ? undefined : toRRule(input.rrule);

    const updated = await ctx.store.updateEvent(input.id, patch);
    await ctx.store.appendAudit({
      actor: ctx.actor,
      action: 'update',
      eventIds: [input.id],
      summary: describePatch(patch),
    });
    return json({ ok: true, event: serializeEvent(updated) });
  },
};

const deleteEvents: ToolDef = {
  name: 'delete_events',
  title: 'Delete events',
  description:
    'Permanently delete events by id. Destructive and not undoable. ' +
    'Call once with confirm=false (the default) to preview exactly what would be deleted, then again with confirm=true.',
  inputSchema: {
    ids: z.array(z.string().min(1)).min(1).max(100),
    confirm: z.boolean().optional().describe('Must be true to actually delete'),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  async run(ctx, args) {
    const input = z
      .object({ ids: z.array(z.string().min(1)).min(1).max(100), confirm: z.boolean().optional() })
      .parse(args);

    const found: CalendarEvent[] = [];
    const missing: string[] = [];
    for (const id of input.ids) {
      const ev = await ctx.store.getEvent(id);
      if (ev) found.push(ev);
      else missing.push(id);
    }

    const preview = {
      would_delete: found.map((ev) => ({ event_id: ev.id, title: ev.title, start: ev.start.toISOString() })),
      missing,
    };

    if (!input.confirm) {
      return json({ ...preview, deleted: 0, note: 'Nothing was deleted. Call again with confirm=true to proceed.' });
    }
    if (found.length === 0) return json({ ...preview, deleted: 0, note: 'No matching events; nothing deleted.' });

    const deleted = await ctx.store.deleteEvents(found.map((ev) => ev.id));
    await ctx.store.appendAudit({
      actor: ctx.actor,
      action: 'delete',
      eventIds: found.map((ev) => ev.id),
      summary: `deleted ${found.map((ev) => `"${ev.title}" (${ev.start.toISOString()})`).join(', ')}`,
    });
    return json({ ...preview, deleted, note: `${deleted} event(s) deleted.` });
  },
};

const findFreeSlot: ToolDef = {
  name: 'find_free_slot',
  title: 'Find free time slots on a day',
  description:
    'List 30-minute-start slots between 08:00 and 18:00 on one day that do not overlap any busy timed event. ' +
    'Deadlines, holidays and all-day events never block a slot.',
  inputSchema: {
    date: z.string().describe('YYYY-MM-DD or ISO datetime for the day'),
    duration_minutes: z.number().int().positive().max(12 * 60).optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, args) {
    const input = z
      .object({ date: z.string(), duration_minutes: z.number().int().positive().max(12 * 60).optional() })
      .parse(args);
    const day = input.date.length === 10 ? parseDateOnly(input.date, 'date') : parseDateTime(input.date, 'date');
    const dur = input.duration_minutes ?? 60;
    const free = suggestSlots(day, dur, await ctx.store.listEvents()).filter((s) => s.busyCount === 0);

    return json({
      date: input.date,
      duration_minutes: dur,
      free_slots: free.map((s) => {
        const d = new Date(day);
        d.setHours(s.h, s.m, 0, 0);
        return d.toISOString();
      }),
    });
  },
};

const suggestDatesTool: ToolDef = {
  name: 'suggest_dates',
  title: 'Suggest quiet days',
  description:
    'Rank the next four weeks by how little busy timed event time they hold, and return the quietest days. ' +
    'Use for "when should we do X?" questions.',
  inputSchema: {
    from: z.string().optional().describe('ISO date to start looking from. Defaults to today.'),
    duration_minutes: z.number().int().positive().max(12 * 60).optional(),
    count: z.number().int().positive().max(14).optional(),
    include_weekends: z.boolean().optional(),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  async run(ctx, args) {
    const input = z
      .object({
        from: z.string().optional(),
        duration_minutes: z.number().int().positive().max(12 * 60).optional(),
        count: z.number().int().positive().max(14).optional(),
        include_weekends: z.boolean().optional(),
      })
      .parse(args);
    const from = input.from ? parseDateTime(input.from, 'from') : startOfDay(new Date());
    const suggestions = suggestDates(
      from,
      input.duration_minutes ?? 60,
      await ctx.store.listEvents(),
      input.count ?? 4,
      input.include_weekends ?? false,
    );

    return json(
      suggestions.map((s) => ({
        date: `${s.date.getFullYear()}-${String(s.date.getMonth() + 1).padStart(2, '0')}-${String(s.date.getDate()).padStart(2, '0')}`,
        event_count: s.count,
        busy_minutes: Math.round(s.busyMins),
      })),
    );
  },
};

export const TOOLS: readonly ToolDef[] = [
  listEvents,
  searchEvents,
  getEvent,
  listCategories,
  createEvent,
  updateEvent,
  deleteEvents,
  findFreeSlot,
  suggestDatesTool,
];
