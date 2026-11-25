import type * as Sentry from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { createBeforeSend, isNoisyRequest, MAX_EVENTS_PER_SESSION } from './sentry';

describe('isNoisyRequest', () => {
  it('skips Google background traffic', () => {
    expect(isNoisyRequest('https://www.google.com/recaptcha/api2/clr')).toBe(true);
    expect(
      isNoisyRequest('https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel'),
    ).toBe(true);
  });

  it('keeps app requests and look-alike hosts', () => {
    expect(isNoisyRequest('/api/events')).toBe(false);
    expect(isNoisyRequest('https://example.com/google.com')).toBe(false);
    expect(isNoisyRequest('https://notgoogle.com/')).toBe(false);
  });
});

describe('createBeforeSend', () => {
  it('strips user email, username, and ip_address while preserving id', () => {
    const beforeSend = createBeforeSend();
    const event = {
      user: {
        id: 'uid-123',
        email: 'user@example.com',
        username: 'alice',
        ip_address: '1.2.3.4',
      },
    } as Sentry.ErrorEvent;

    const scrubbed = beforeSend(event);
    expect(scrubbed?.user?.id).toBe('uid-123');
    expect(scrubbed?.user?.email).toBeUndefined();
    expect(scrubbed?.user?.username).toBeUndefined();
    expect(scrubbed?.user?.ip_address).toBeUndefined();
  });

  it('allows MAX_EVENTS_PER_SESSION events and drops subsequent ones', () => {
    const beforeSend = createBeforeSend();
    for (let i = 0; i < MAX_EVENTS_PER_SESSION; i += 1) {
      expect(beforeSend({ event_id: `evt-${i}` } as Sentry.ErrorEvent)).not.toBeNull();
    }
    expect(beforeSend({ event_id: 'evt-overflow' } as Sentry.ErrorEvent)).toBeNull();
  });
});
