import { describe, expect, it } from 'vitest'

import { formatPetroleumSlice, isPetroleumSlice, parsePetroleumSlice } from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected a successful result')
    },
  )(result)

describe('PetroleumSlice', () => {
  it('parses supported slices', () => {
    const slice = unwrapSuccess(parsePetroleumSlice('Inventory'))

    expect(isPetroleumSlice(slice)).toBe(true)
    expect(formatPetroleumSlice(slice)).toBe('Inventory')
  })

  it('rejects unsupported slices', () => {
    expect(parsePetroleumSlice('Biofuel')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidPetroleumSliceInput',
        input: 'Biofuel',
      },
    })
  })

  it('preserves identity when revalidating a constructed slice', () => {
    const initial = unwrapSuccess(parsePetroleumSlice('Price'))

    const repeated = parsePetroleumSlice(initial)

    expect(repeated.ok).toBe(true)

    const repeatedSlice = unwrapSuccess(repeated)

    expect(repeatedSlice).toBe(initial)
    expect(formatPetroleumSlice(repeatedSlice)).toBe('Price')
  })
})
