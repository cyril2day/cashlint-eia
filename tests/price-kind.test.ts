import { describe, expect, it } from 'vitest'

import { parsePriceKind, isPriceKind, formatPriceKind } from '@/contexts/measurement/model'
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

describe('PriceKind domain value', () => {
  it('parses WTISpot', () => {
    const p = unwrapSuccess(parsePriceKind('WTISpot'))

    expect(isPriceKind(p)).toBe(true)
    expect(formatPriceKind(p)).toBe('WTISpot')
  })

  it('rejects invalid input', () => {
    expect(parsePriceKind('NotARealPrice')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidPriceKindInput',
        input: 'NotARealPrice',
      },
    })
  })

  it('identity: recognizes already-constructed PriceKind', () => {
    const initial = unwrapSuccess(parsePriceKind('WTISpot'))

    const repeated = parsePriceKind(initial)

    expect(repeated.ok).toBe(true)

    const repeatedValue = unwrapSuccess(repeated)

    expect(repeatedValue).toBe(initial)
    expect(formatPriceKind(repeatedValue)).toBe('WTISpot')
  })
})
