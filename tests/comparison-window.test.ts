import { describe, expect, it } from 'vitest'

import { parseComparisonWindow, isComparisonWindow, formatComparisonWindow } from '@/contexts/measurement/model'
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

describe('ComparisonWindow domain value', () => {
  it('parses supported windows', () => {
    const one = unwrapSuccess(parseComparisonWindow('OneWeek'))
    expect(isComparisonWindow(one)).toBe(true)
    expect(formatComparisonWindow(one)).toBe('OneWeek')

    const two = unwrapSuccess(parseComparisonWindow('TwoWeek'))
    expect(isComparisonWindow(two)).toBe(true)
    expect(formatComparisonWindow(two)).toBe('TwoWeek')

    const four = unwrapSuccess(parseComparisonWindow('FourWeek'))
    expect(isComparisonWindow(four)).toBe(true)
    expect(formatComparisonWindow(four)).toBe('FourWeek')
  })

  it('rejects unsupported windows', () => {
    expect(parseComparisonWindow('ThreeWeek')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidComparisonWindowInput',
        input: 'ThreeWeek',
      },
    })
  })

  it('preserves identity when revalidating constructed window', () => {
    const initial = unwrapSuccess(parseComparisonWindow('OneWeek'))
    const repeated = parseComparisonWindow(initial)

    expect(repeated.ok).toBe(true)
    const repeatedValue = unwrapSuccess(repeated)

    expect(repeatedValue).toBe(initial)
    expect(formatComparisonWindow(repeatedValue)).toBe('OneWeek')
  })
})
