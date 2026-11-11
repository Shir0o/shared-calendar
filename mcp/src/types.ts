// Wire types shared by the tool layer and the two transports.
// Kept free of the MCP SDK so tools can be unit-tested without a server.
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { CalendarEvent, RRule } from '../../src/lib/calendar';

export interface ToolContext {
  store: CalendarStore;
  /** Who is acting, for the audit trail. */
  actor: string;
}

export interface ToolResult {
  text: string;
  isError?: boolean;
}

export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  /** Zod raw shape, handed to the MCP SDK for schema generation. */
  inputSchema: ZodRawShapeCompat;
  annotations?: ToolAnnotations;
  run(ctx: ToolContext, args: unknown): Promise<ToolResult>;
}

/** The writable subset of an event. `id` is assigned by the store. */
export interface EventInput {
  title: string;
  cat: CalendarEvent['cat'];
  start: Date;
  dur?: number;
  allDay?: boolean;
  end?: Date;
  loc?: string;
  notes?: string;
  rrule?: RRule;
}

export type EventPatch = Partial<EventInput>;

export interface AuditEntry {
  actor: string;
  action: 'create' | 'update' | 'delete';
  eventIds: string[];
  /** Short human-readable summary of what changed. */
  summary: string;
}

/**
 * Storage boundary. Implemented twice: the Admin SDK (Node/stdio) and
 * Firestore REST (Workers). Neither goes through firestore.rules.
 */
export interface CalendarStore {
  listEvents(): Promise<CalendarEvent[]>;
  getEvent(id: string): Promise<CalendarEvent | null>;
  createEvent(input: EventInput): Promise<string>;
  updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent>;
  deleteEvents(ids: string[]): Promise<number>;
  appendAudit(entry: AuditEntry): Promise<void>;
}
