// tokensForHue is the formula used to derive a category's color tokens from a
// single hue value when the owner overrides it. A drift in this function
// would silently change every customized category's appearance.
import { describe, expect, it } from 'vitest';
import { tokensForHue } from './calendar';

describe('tokensForHue', () => {
  it('produces the documented oklch triple', () => {
    expect(tokensForHue(200)).toEqual({
      dot: 'oklch(0.62 0.14 200)',
      soft: 'oklch(0.95 0.04 200)',
      ink: 'oklch(0.34 0.12 200)',
    });
  });
  it('normalizes hue into [0, 360)', () => {
    expect(tokensForHue(-30).dot).toBe('oklch(0.62 0.14 330)');
    expect(tokensForHue(400).dot).toBe('oklch(0.62 0.14 40)');
    expect(tokensForHue(360).dot).toBe('oklch(0.62 0.14 0)');
  });
});
