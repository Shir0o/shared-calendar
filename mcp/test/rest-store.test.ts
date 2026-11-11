// REST transport tests: the Firestore value codec and the service-account JWT.
// No network, no credentials.
import { describe, expect, it } from 'vitest';
import { decodeValue, encodeValue, signJwt, toRestFields, type FsValue } from '../src/rest-store';
import type { CalendarEvent } from '../../src/lib/calendar';

describe('Firestore REST value codec', () => {
  it('round-trips the scalar types the calendar uses', () => {
    const values = ['hello', 90, 1.5, true, null, new Date('2026-03-02T10:00:00.000Z')];
    for (const v of values) {
      expect(decodeValue(encodeValue(v))).toEqual(v);
    }
  });

  it('encodes whole numbers as integers, not doubles', () => {
    expect(encodeValue(90)).toEqual({ integerValue: '90' });
    expect(encodeValue(1.5)).toEqual({ doubleValue: 1.5 });
  });

  it('round-trips nested maps and arrays', () => {
    const value = { freq: 'weekly', byday: ['MO', 'WE'], until: new Date('2026-12-31T00:00:00.000Z') };
    expect(decodeValue(encodeValue(value))).toEqual(value);
  });

  it('drops undefined fields instead of writing nulls', () => {
    const encoded = encodeValue({ a: 1, b: undefined }) as { mapValue: { fields: Record<string, FsValue> } };
    expect(Object.keys(encoded.mapValue.fields)).toEqual(['a']);
  });
});

describe('toRestFields', () => {
  const event: CalendarEvent = {
    id: 'ev1',
    title: 'Standup',
    cat: 'meeting',
    start: new Date('2026-03-02T09:00:00.000Z'),
    dur: 30,
    allDay: false,
    loc: 'Room 4',
    notes: '',
    rrule: { freq: 'weekly', byday: ['MO', 'WE'], until: new Date('2026-06-01T00:00:00.000Z') },
  };

  it('emits Firestore field values for a timed event', () => {
    const fields = toRestFields(event);
    expect(fields.title).toEqual({ stringValue: 'Standup' });
    expect(fields.start).toEqual({ timestampValue: '2026-03-02T09:00:00.000Z' });
    expect(fields.dur).toEqual({ integerValue: '30' });
    expect(fields.allDay).toEqual({ booleanValue: false });
    expect(fields.rrule).toEqual({
      mapValue: {
        fields: {
          freq: { stringValue: 'weekly' },
          byday: { arrayValue: { values: [{ stringValue: 'MO' }, { stringValue: 'WE' }] } },
          until: { timestampValue: '2026-06-01T00:00:00.000Z' },
        },
      },
    });
  });

  it('normalises all-day starts to UTC midnight, as the app does', () => {
    const fields = toRestFields({
      id: 'ev2',
      title: 'Holiday',
      cat: 'holiday',
      start: new Date(2026, 6, 4),
      allDay: true,
    });
    expect(fields.start).toEqual({ timestampValue: '2026-07-04T00:00:00.000Z' });
  });

  it('rejects a document with no title', () => {
    const malformed = { id: 'x', cat: 'meeting', start: new Date() } as unknown as CalendarEvent;
    expect(() => toRestFields(malformed)).toThrow();
  });
});

describe('signJwt', () => {
  it('signs an RS256 JWT the matching public key verifies', async () => {
    const keyPair = (await crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair;

    const pkcs8 = (await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)) as ArrayBuffer;
    const base64 = Buffer.from(pkcs8).toString('base64');
    const pem = `-----BEGIN PRIVATE KEY-----\n${base64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----\n`;

    const jwt = await signJwt({ iss: 'sa@example.iam.gserviceaccount.com', exp: 1 }, pem);
    const [header, claims, signature] = jwt.split('.');

    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(JSON.parse(Buffer.from(claims, 'base64url').toString()).iss).toBe('sa@example.iam.gserviceaccount.com');

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      keyPair.publicKey,
      Buffer.from(signature, 'base64url'),
      new TextEncoder().encode(`${header}.${claims}`),
    );
    expect(valid).toBe(true);
  });
});
