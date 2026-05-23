import { describe, expect, it } from 'vitest'

import {
  parseReportWeek,
  parseGeographyScope,
  parsePetroleumSlice,
  parseMeasurementKind,
  parseMeasurementUnit,
  createRefineryMeasurement,
  parseRefineryMeasurement,
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

describe('RefineryMeasurement', () => {
  it('constructs a valid refinery measurement', () => {
    const measurementKind = unwrapSuccess(parseMeasurementKind('RefineryNetInput'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Refinery'))
    const value = unwrapSuccess(parseDecimal('456'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay'))

    const fact = createWeeklyFact(reportWeek, geography, slice, measurementKind, value, unit, none())

    const measurement = createRefineryMeasurement(measurementKind, fact)
    const parsed = parseRefineryMeasurement(measurement)

    expect(parsed.ok).toBe(true)
    expect(unwrapSuccess(parsed).measurementKind.kind).toBe('RefineryNetInput')
  })

  it('rejects incompatible weekly facts', () => {
    const measurementKind = unwrapSuccess(parseMeasurementKind('RefineryNetInput'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Supply'))
    const incompatibleKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
    const value = unwrapSuccess(parseDecimal('456'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay'))

    const fact = createWeeklyFact(reportWeek, geography, slice, incompatibleKind, value, unit, none())

    const measurement = createRefineryMeasurement(measurementKind, fact)
    const parsed = parseRefineryMeasurement(measurement)

    expect(parsed.ok).toBe(false)
  })

  it('rejects stock units for refinery flow measurements', () => {
    const measurementKind = unwrapSuccess(parseMeasurementKind('RefineryNetInput'))
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const slice = unwrapSuccess(parsePetroleumSlice('Refinery'))
    const value = unwrapSuccess(parseDecimal('456'))
    const unit = unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))

    const fact = createWeeklyFact(reportWeek, geography, slice, measurementKind, value, unit, none())

    const measurement = createRefineryMeasurement(measurementKind, fact)
    const parsed = parseRefineryMeasurement(measurement)

    expect(parsed.ok).toBe(false)
  })
})
