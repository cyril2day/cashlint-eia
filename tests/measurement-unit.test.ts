import { describe, expect, it } from 'vitest'

import {
  formatMeasurementUnit,
  isMeasurementUnit,
  measurementUnitCategory,
  parseMeasurementUnit,
} from '@/contexts/measurement/model'
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

describe('MeasurementUnit', () => {
  it('parses supported measurement units', () => {
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))

    expect(isMeasurementUnit(unit)).toBe(true)
    expect(formatMeasurementUnit(unit)).toBe('ThousandBarrels')
  })

  it('categorizes units correctly', () => {
    const stock = unwrapSuccess(parseMeasurementUnit('MillionBarrels'))
    const flow = unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay'))
    const pct = unwrapSuccess(parseMeasurementUnit('Percent'))
    const price = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))

    expect(measurementUnitCategory(stock)).toBe('stock')
    expect(measurementUnitCategory(flow)).toBe('flow')
    expect(measurementUnitCategory(pct)).toBe('percentage')
    expect(measurementUnitCategory(price)).toBe('price')
  })

  it('rejects unsupported measurement units', () => {
    expect(parseMeasurementUnit('Gigawatts')).toEqual({
      ok: false,
      error: {
        kind: 'InvalidMeasurementUnitInput',
        input: 'Gigawatts',
      },
    })
  })
})
