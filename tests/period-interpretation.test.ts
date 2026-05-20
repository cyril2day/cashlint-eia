import { describe, expect, it } from 'vitest'

import { parseIsoDate } from '@/shared/date'
import { failure, success } from '@/shared/result'

describe('period interpretation', () => {
  it('accepts valid ISO dates', () => {
    const r = parseIsoDate('2026-01-09')

    expect(r).toEqual(success('2026-01-09'))
  })

  it('rejects malformed calendar dates', () => {
    const r = parseIsoDate('2026-02-30')

    expect(r).toEqual(failure({ kind: 'InvalidIsoDate', input: '2026-02-30' }))
  })
})
