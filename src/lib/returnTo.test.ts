import { describe, expect, it } from 'vitest';
import { getSafeReturnTo } from './returnTo';

describe('getSafeReturnTo', () => {
  const origin = 'https://flyup.example';

  it('accepts an internal profile path with its query string', () => {
    expect(getSafeReturnTo('/booster/profile?tab=verify', origin)).toBe('/booster/profile?tab=verify');
  });

  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
  ])('rejects an external or unsafe destination: %s', requested => {
    expect(getSafeReturnTo(requested, origin)).toBe('');
  });
});
