import { describe, expect, it } from 'vitest'

import {
  parseReportWeek,
  parseGeographyScope,
  parsePetroleumSlice,
  parseMeasurementKind,
  parseMeasurementUnit,
  createSupplyMeasurement,
  parseSupplyMeasurement,
} from '@/contexts/measurement/model'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'
import { parseDecimal } from '@/shared/decimal'
import { none } from '@/shared/maybe'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected a successful result')
    },
  )(result)

describe('SupplyMeasurement', () => {
  it('constructs a valid supply measurement', () => {
    const measurementKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Supply'))
    const value = unwrapSuccess(parseDecimal('789'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay'))

    const fact = createWeeklyFact(reportWeek, geography, slice, measurementKind, value, unit, none())

    const measurement = createSupplyMeasurement(measurementKind, fact)
    const parsed = parseSupplyMeasurement(measurement)

    expect(parsed.ok).toBe(true)
    expect(unwrapSuccess(parsed).measurementKind.kind).toBe('DomesticProduction')
  })

  it('rejects incompatible weekly facts', () => {
    const measurementKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const incompatibleKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const value = unwrapSuccess(parseDecimal('789'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay'))

    const fact = createWeeklyFact(reportWeek, geography, slice, incompatibleKind, value, unit, none())

    const measurement = createSupplyMeasurement(measurementKind, fact)
    const parsed = parseSupplyMeasurement(measurement)

    expect(parsed.ok).toBe(false)
  })

  it('rejects stock units for supply flow measurements', () => {
    const measurementKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Supply'))
    const value = unwrapSuccess(parseDecimal('789'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))

    const fact = createWeeklyFact(reportWeek, geography, slice, measurementKind, value, unit, none())

    const measurement = createSupplyMeasurement(measurementKind, fact)
    const parsed = parseSupplyMeasurement(measurement)

    expect(parsed.ok).toBe(false)
  })
})
