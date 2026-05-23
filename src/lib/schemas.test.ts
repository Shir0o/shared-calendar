import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GcalConnectResponse,
  GcalDisconnectResponse,
  GcalSyncNowResponse,
  EventDocSchema,
} from '../../shared/schemas';

const ROOT = join(__dirname, '..', '..');

describe('wire-boundary schemas', () => {
  it('GcalConnectResponse accepts a valid payload', () => {
    expect(() =>
      GcalConnectResponse.parse({ ok: true, feedId: 'abc', count: 0 }),
    ).not.toThrow();
  });

  it('GcalConnectResponse rejects missing count (the c82f4d1 drift case)', () => {
    expect(() =>
      GcalConnectResponse.parse({ ok: true, feedId: 'abc' }),
    ).toThrow();
  });

  it('GcalConnectResponse rejects an object that is the SyncResult-shape instead of the count', () => {
    // Mirrors the actual bug: gcalConnect returned `count: <SyncResult>` and
    // the client passed it through unvalidated.
    expect(() =>
      GcalConnectResponse.parse({
        ok: true,
        feedId: 'abc',
        count: { total: 1, written: 1, skipped: 0, deleted: 0 },
      }),
    ).toThrow();
  });

  it('GcalDisconnectResponse accepts {ok:true}', () => {
    expect(() => GcalDisconnectResponse.parse({ ok: true })).not.toThrow();
  });

  it('GcalDisconnectResponse rejects ok:false', () => {
    expect(() => GcalDisconnectResponse.parse({ ok: false })).toThrow();
  });

  it('GcalSyncNowResponse accepts a valid payload', () => {
    expect(() =>
      GcalSyncNowResponse.parse({ ok: true, count: 2, written: 1, skipped: 1 }),
    ).not.toThrow();
  });

  it('GcalSyncNowResponse rejects missing written', () => {
    expect(() =>
      GcalSyncNowResponse.parse({ ok: true, count: 2, skipped: 1 }),
    ).toThrow();
  });

  it('EventDocSchema accepts a minimal event', () => {
    expect(() =>
      EventDocSchema.parse({ title: 'x', cat: 'meeting', start: new Date() }),
    ).not.toThrow();
  });

  it('EventDocSchema tolerates passthrough fields', () => {
    const r = EventDocSchema.parse({
      title: 'x',
      cat: 'meeting',
      start: new Date(),
      futureField: 'whatever',
    });
    expect((r as { futureField?: string }).futureField).toBe('whatever');
  });

  it('EventDocSchema rejects a non-string title', () => {
    expect(() =>
      EventDocSchema.parse({ title: 42, cat: 'meeting', start: new Date() }),
    ).toThrow();
  });
});

describe('schemas drift guard', () => {
  it('shared/schemas.ts and functions/src/schemas.ts have identical source', () => {
    const a = readFileSync(join(ROOT, 'shared/schemas.ts'), 'utf8');
    const b = readFileSync(join(ROOT, 'functions/src/schemas.ts'), 'utf8');
    expect(b).toBe(a);
  });
});
