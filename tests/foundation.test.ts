import { describe, expect, it } from 'vitest';
import { foundationPillars } from '@/app/foundation';

describe('foundation tokens', () => {
  it('lists the foundation technology stack', () => {
    expect(foundationPillars).toEqual(
      expect.arrayContaining(['Next.js', 'TypeScript', 'Sass', 'Vitest', 'Ramda', 'D3'])
    );
  });
});