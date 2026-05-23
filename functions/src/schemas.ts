// Runtime validators for Firebase wire boundaries (callable responses and
// persisted event docs). TypeScript types at these boundaries are claims, not
// checks — these schemas make them load-bearing so the next type drift throws
// at the boundary instead of silently propagating.
//
// Duplicated in functions/src/schemas.ts (same workspace-boundary constraint
// that drove shared/owner.ts). Drift guard in src/lib/schemas.test.ts.
import { z } from 'zod';

export const GcalConnectResponse = z.object({
  ok: z.literal(true),
  feedId: z.string().min(1),
  count: z.number().int().nonnegative(),
});
export type GcalConnectResponse = z.infer<typeof GcalConnectResponse>;

export const GcalDisconnectResponse = z.object({
  ok: z.literal(true),
  deleted: z.number().int().nonnegative().optional(),
});
export type GcalDisconnectResponse = z.infer<typeof GcalDisconnectResponse>;

export const GcalPurgeOrphanResponse = z.object({
  ok: z.literal(true),
  deleted: z.number().int().nonnegative(),
});
export type GcalPurgeOrphanResponse = z.infer<typeof GcalPurgeOrphanResponse>;

export const GcalSyncNowResponse = z.object({
  ok: z.literal(true),
  count: z.number().int().nonnegative(),
  written: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type GcalSyncNowResponse = z.infer<typeof GcalSyncNowResponse>;

// Shape-only validation for persisted event docs. Firestore Timestamp values
// stay `unknown` here — the existing toDate() helpers handle coercion.
// .passthrough() so server-side additions don't break clients.
export const EventDocSchema = z.object({
  title: z.string(),
  cat: z.string(),
  start: z.unknown(),
  dur: z.number().nullable().optional(),
  allDay: z.boolean().optional(),
  end: z.unknown().optional(),
  loc: z.string().optional(),
  notes: z.string().optional(),
  rrule: z.unknown().nullable().optional(),
  gcalUid: z.string().optional(),
  gcalFeedId: z.string().optional(),
  syncOrigin: z.literal('gcal').optional(),
  lastModified: z.unknown().nullable().optional(),
}).passthrough();
export type EventDoc = z.infer<typeof EventDocSchema>;
