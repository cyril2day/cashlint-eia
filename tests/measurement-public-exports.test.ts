import { describe, expect, it } from 'vitest'

import { parsePriceKind } from '@/contexts/measurement'

describe('Measurement public exports', () => {
  it('exposes model constructors from the public measurement entry', () => {
    expect(typeof parsePriceKind).toBe('function')
  })
})
