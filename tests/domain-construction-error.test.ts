import { describe, expect, it } from 'vitest'

import { makeDomainConstructionError, isDomainConstructionError } from '@/shared/domain'

describe('DomainConstructionError helper', () => {
  it('creates a normalized error shape', () => {
    const e = makeDomainConstructionError('InvalidX', 123)
    expect(e).toEqual({ kind: 'InvalidX', input: '123' })
    expect(isDomainConstructionError(e)).toBe(true)
  })

  it('recognizes non-errors', () => {
    expect(isDomainConstructionError({})).toBe(false)
    expect(isDomainConstructionError(null)).toBe(false)
    expect(isDomainConstructionError('foo')).toBe(false)
  })
})
