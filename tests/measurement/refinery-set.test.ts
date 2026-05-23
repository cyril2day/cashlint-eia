import { describe, expect, it } from 'vitest'

import {
  assembleRefinerySet,
  createRefineryMeasurement,
  parseGeographyScope,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parseReportWeek,
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

describe('RefinerySet', () => {
  it('assembles a refinery set with optional supporting measurements', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))

    const netInputKind = unwrapSuccess(parseMeasurementKind('RefineryNetInput'))
    const grossInputKind = unwrapSuccess(parseMeasurementKind('RefineryGrossInput'))
    const netInputFact = createWeeklyFact(
      reportWeek,
      geography,
      unwrapSuccess(parsePetroleumSlice('Refinery')),
      netInputKind,
      unwrapSuccess(parseDecimal('100')),
      unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')),
      none(),
    )
    const grossInputFact = createWeeklyFact(
      reportWeek,
      geography,
      unwrapSuccess(parsePetroleumSlice('Refinery')),
      grossInputKind,
      unwrapSuccess(parseDecimal('120')),
      unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')),
      none(),
    )

    const assembled = assembleRefinerySet([
      createRefineryMeasurement(netInputKind, netInputFact),
      createRefineryMeasurement(grossInputKind, grossInputFact),
    ])

    expect(assembled.ok).toBe(true)
    expect(unwrapSuccess(assembled).grossInput.kind).toBe('Some')
  })

  it('fails when the required refinery net input is missing', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const grossInputKind = unwrapSuccess(parseMeasurementKind('RefineryGrossInput'))
    const grossInputFact = createWeeklyFact(
      reportWeek,
      geography,
      unwrapSuccess(parsePetroleumSlice('Refinery')),
      grossInputKind,
      unwrapSuccess(parseDecimal('120')),
      unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')),
      none(),
    )

    const assembled = assembleRefinerySet([createRefineryMeasurement(grossInputKind, grossInputFact)])

    expect(assembled.ok).toBe(false)
  })
})