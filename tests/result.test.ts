import { describe, expect, it } from 'vitest';

import type { Result } from '@/shared/result';

describe('Result', () => {
  it('represents success values', () => {
    const result: Result<number, string> = {
      ok: true,
      value: 42,
    };

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('represents failure values', () => {
    const result: Result<number, string> = {
      ok: false,
      error: 'missing data',
    };

    expect(result.ok).toBe(false);

    if (result.ok === false) {
      expect(result.error).toBe('missing data');
    }
  });

  it('supports array errors', () => {
    const result: Result<number, readonly string[]> = {
      ok: false,
      error: ['first problem', 'second problem'],
    };

    expect(result.ok).toBe(false);

    if (result.ok === false) {
      expect(result.error).toEqual(['first problem', 'second problem']);
    }
  });
});