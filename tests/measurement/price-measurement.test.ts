import { describe, expect, it } from 'vitest'

import { parsePriceKind, parseReportWeek, parseGeographyScope, parsePetroleumSlice, parseMeasurementKind, parseMeasurementUnit } from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import { parseDecimal } from '@/shared/decimal'
import { none } from '@/shared/maybe'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { createPriceMeasurement, parsePriceMeasurement } from '@/contexts/measurement/model/price-measurement'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected a successful result')
    },
  )(result)

describe('PriceMeasurement', () => {
  it('constructs a valid WTI price measurement', () => {
    const kind = unwrapSuccess(parsePriceKind('WTISpot'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Price'))
    const measurementKind = unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
    const value = unwrapSuccess(parseDecimal('72'))
    const unit = unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))

    const fact = createWeeklyFact(reportWeek, geography, slice, measurementKind, value, unit, none())

    const measurement = createPriceMeasurement(kind, fact)

    const parsed = parsePriceMeasurement(measurement)

    expect(parsed.ok).toBe(true)
    const m = unwrapSuccess(parsed)
    expect(Reflect.get(m.kind, 'kind')).toBe('WTISpot')
  })

  it('rejects incompatible weekly facts', () => {
    const kind = unwrapSuccess(parsePriceKind('WTISpot'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const measurementKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const value = unwrapSuccess(parseDecimal('123'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))

    const fact = createWeeklyFact(reportWeek, geography, slice, measurementKind, value, unit, none())

    const measurement = createPriceMeasurement(kind, fact)

    const parsed = parsePriceMeasurement(measurement)

    expect(parsed.ok).toBe(false)
  })
})
