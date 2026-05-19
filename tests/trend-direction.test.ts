import { describe, expect, it } from 'vitest'

import { parseTrendDirection, isTrendDirection, formatTrendDirection } from '@/contexts/measurement/model'
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

describe('TrendDirection domain value', () => {
  it('parses supported directions', () => {
    const up = unwrapSuccess(parseTrendDirection('Up'))
    expect(isTrendDirection(up)).toBe(true)
    expect(formatTrendDirection(up)).toBe('Up')

    const down = unwrapSuccess(parseTrendDirection('Down'))
    expect(isTrendDirection(down)).toBe(true)
    expect(formatTrendDirection(down)).toBe('Down')

    const flat = unwrapSuccess(parseTrendDirection('Flat'))
    expect(isTrendDirection(flat)).toBe(true)
    expect(formatTrendDirection(flat)).toBe('Flat')
  })

  it('rejects unsupported directions', () => {
    expect(parseTrendDirection('Sideways')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidTrendDirectionInput',
        input: 'Sideways',
      },
    })
  })

  it('preserves identity when revalidating constructed direction', () => {
    const initial = unwrapSuccess(parseTrendDirection('Up'))
    const repeated = parseTrendDirection(initial)

    expect(repeated.ok).toBe(true)
    const repeatedValue = unwrapSuccess(repeated)

    expect(repeatedValue).toBe(initial)
    expect(formatTrendDirection(repeatedValue)).toBe('Up')
  })
})
