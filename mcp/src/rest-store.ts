// Firestore REST store, for the Cloudflare Worker.
//
// firebase-admin cannot run in Workers (gRPC, node built-ins), so this talks to
// the Firestore REST API with a service-account JWT signed through WebCrypto —
// the same credential model as the stdio store, no extra server.
//
// REST also means no Admin SDK safety net, so every write is validated by
// EventDocSchema exactly as in store.ts before it leaves the Worker.
import { EventDocSchema } from '../../shared/schemas';
import type { CalendarEvent } from '../../src/lib/calendar';
import { fromDoc, toNeutralDoc } from './map';
import type { AuditEntry, CalendarStore, EventInput, EventPatch } from './types';

const FIRESTORE_HOST = 'https://firestore.googleapis.com/v1';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/datastore';
const COLL = 'events';
const AUDIT_COLL = 'auditLog';

export interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

// ─── Firestore REST value codec ─────────────────────────────────────────────

export type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { arrayValue: { values: FsValue[] } }
  | { mapValue: { fields: Record<string, FsValue> } };

export function encodeValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  const fields: Record<string, FsValue> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (val !== undefined) fields[k] = encodeValue(val);
  }
  return { mapValue: { fields } };
}

export function decodeValue(v: FsValue): unknown {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return v.arrayValue.values.map(decodeValue);
  return decodeFields(v.mapValue.fields);
}

function decodeFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

/** CalendarEvent → Firestore REST `fields`, validated. */
export function toRestFields(ev: CalendarEvent): Record<string, FsValue> {
  const doc = toNeutralDoc(ev);
  const parsed = EventDocSchema.parse({
    title: doc.title,
    cat: doc.cat,
    start: doc.start,
    dur: doc.dur,
    allDay: doc.allDay,
    end: doc.end,
    loc: doc.loc,
    notes: doc.notes,
    rrule: doc.rrule
      ? {
          freq: doc.rrule.freq,
          interval: doc.rrule.interval,
          byday: doc.rrule.byday,
          count: doc.rrule.count,
          until: doc.rrule.until,
          exdates: doc.rrule.exdates,
        }
      : undefined,
  });

  const fields: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (v !== undefined) fields[k] = encodeValue(v);
  }
  return fields;
}

// ─── Service-account auth ───────────────────────────────────────────────────

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

export async function signJwt(claims: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const enc = new TextEncoder();
  const signingInput = `${base64url(enc.encode(JSON.stringify(header)))}.${base64url(enc.encode(JSON.stringify(claims)))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPkcs8(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

export async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const cached = tokenCache.get(sa.client_email);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(
    {
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    sa.private_key,
  );

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Service-account token exchange failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(sa.client_email, {
    token: body.access_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  });
  return body.access_token;
}

// ─── Store ──────────────────────────────────────────────────────────────────

export class RestStore implements CalendarStore {
  private readonly sa: ServiceAccount;
  private readonly base: string;

  constructor(sa: ServiceAccount) {
    if (!sa.project_id || !sa.client_email || !sa.private_key) {
      throw new Error('Service account is missing project_id, client_email or private_key');
    }
    this.sa = sa;
    this.base = `${FIRESTORE_HOST}/projects/${sa.project_id}/databases/(default)/documents`;
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const token = await getAccessToken(this.sa);
    return fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }

  async listEvents(): Promise<CalendarEvent[]> {
    const out: CalendarEvent[] = [];
    let pageToken: string | undefined;
    do {
      const query = new URLSearchParams({ pageSize: '300' });
      if (pageToken) query.set('pageToken', pageToken);
      const res = await this.request(`/${COLL}?${query}`);
      if (!res.ok) throw new Error(`Firestore list failed (${res.status}): ${await res.text()}`);
      const body = (await res.json()) as {
        documents?: { name: string; fields?: Record<string, FsValue> }[];
        nextPageToken?: string;
      };
      for (const doc of body.documents ?? []) {
        out.push(fromDoc(docId(doc.name), decodeFields(doc.fields ?? {})));
      }
      pageToken = body.nextPageToken;
    } while (pageToken);
    return out;
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    const res = await this.request(`/${COLL}/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Firestore get failed (${res.status}): ${await res.text()}`);
    const doc = (await res.json()) as { name: string; fields?: Record<string, FsValue> };
    return fromDoc(docId(doc.name), decodeFields(doc.fields ?? {}));
  }

  async createEvent(input: EventInput): Promise<string> {
    const id = crypto.randomUUID();
    const fields = toRestFields({ id, ...input });
    const res = await this.request(`/${COLL}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) throw new Error(`Firestore create failed (${res.status}): ${await res.text()}`);
    return id;
  }

  async updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent> {
    const current = await this.getEvent(id);
    if (!current) throw new Error(`No event with id ${id}`);
    const merged: CalendarEvent = { ...current, ...patch, start: patch.start ?? current.start };
    const fields = toRestFields(merged);
    // PATCH without an update mask replaces the document, which is what a full
    // merged write should do — deleted fields stay deleted.
    const res = await this.request(`/${COLL}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    });
    if (!res.ok) throw new Error(`Firestore update failed (${res.status}): ${await res.text()}`);
    return merged;
  }

  async deleteEvents(ids: string[]): Promise<number> {
    for (const id of ids) {
      const res = await this.request(`/${COLL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        throw new Error(`Firestore delete failed (${res.status}): ${await res.text()}`);
      }
    }
    return ids.length;
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    const id = crypto.randomUUID();
    const fields = {
      actor: encodeValue(entry.actor),
      action: encodeValue(entry.action),
      eventIds: encodeValue(entry.eventIds),
      summary: encodeValue(entry.summary),
      at: encodeValue(new Date()),
    };
    const res = await this.request(`/${AUDIT_COLL}?documentId=${encodeURIComponent(id)}`, {
      method: 'POST',
      body: JSON.stringify({ fields }),
    });
    // An audit failure must not lose the write the user asked for; surface it
    // in the Worker logs instead.
    if (!res.ok) console.error(`audit append failed (${res.status}): ${await res.text()}`);
  }
}

function docId(name: string): string {
  const parts = name.split('/');
  return parts[parts.length - 1];
}
