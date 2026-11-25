import { describe, expect, it } from 'vitest';
import { isNoisyRequest } from './sentry';

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
