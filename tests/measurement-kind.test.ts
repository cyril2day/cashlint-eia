import { describe, expect, it } from 'vitest'

import { formatMeasurementKind, isMeasurementKind, parseMeasurementKind } from '@/contexts/measurement/model'
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

describe('MeasurementKind', () => {
  it('parses supported measurement kinds', () => {
    const mk = unwrapSuccess(parseMeasurementKind('CrudeStocks'))

    expect(isMeasurementKind(mk)).toBe(true)
    expect(formatMeasurementKind(mk)).toBe('CrudeStocks')
  })

  it('rejects unsupported measurement kinds', () => {
    expect(parseMeasurementKind('SolarGeneration')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidMeasurementKindInput',
        input: 'SolarGeneration',
      },
    })
  })

  it('preserves identity when revalidating constructed kind', () => {
    const initial = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))

    const repeated = parseMeasurementKind(initial)

    expect(repeated.ok).toBe(true)

    const repeatedKind = unwrapSuccess(repeated)

    expect(repeatedKind).toBe(initial)
    expect(formatMeasurementKind(repeatedKind)).toBe('WTISpotPrice')
  })
})
