import { describe, expect, it } from 'vitest'

import {
  assembleSupplySet,
  createSupplyMeasurement,
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

describe('SupplySet', () => {
  it('assembles a supply set with production, imports, and exports', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const supplySlice = unwrapSuccess(parsePetroleumSlice('Supply'))

    const productionKind = unwrapSuccess(parseMeasurementKind('DomesticProduction'))
    const importsKind = unwrapSuccess(parseMeasurementKind('Imports'))
    const exportsKind = unwrapSuccess(parseMeasurementKind('Exports'))

    const productionFact = createWeeklyFact(reportWeek, geography, supplySlice, productionKind, unwrapSuccess(parseDecimal('10')), unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')), none())
    const importsFact = createWeeklyFact(reportWeek, geography, supplySlice, importsKind, unwrapSuccess(parseDecimal('5')), unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')), none())
    const exportsFact = createWeeklyFact(reportWeek, geography, supplySlice, exportsKind, unwrapSuccess(parseDecimal('2')), unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')), none())

    const assembled = assembleSupplySet([
      createSupplyMeasurement(productionKind, productionFact),
      createSupplyMeasurement(importsKind, importsFact),
      createSupplyMeasurement(exportsKind, exportsFact),
    ])

    expect(assembled.ok).toBe(true)
    expect(unwrapSuccess(assembled).exports.measurementKind.kind).toBe('Exports')
  })

  it('fails when required production is missing', () => {
    const reportWeek = unwrapSuccess(parseReportWeek('2026-05-19T00:00:00.000Z'))
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const supplySlice = unwrapSuccess(parsePetroleumSlice('Supply'))

    const importsKind = unwrapSuccess(parseMeasurementKind('Imports'))
    const exportsKind = unwrapSuccess(parseMeasurementKind('Exports'))

    const importsFact = createWeeklyFact(reportWeek, geography, supplySlice, importsKind, unwrapSuccess(parseDecimal('5')), unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')), none())
    const exportsFact = createWeeklyFact(reportWeek, geography, supplySlice, exportsKind, unwrapSuccess(parseDecimal('2')), unwrapSuccess(parseMeasurementUnit('ThousandBarrelsPerDay')), none())

    const assembled = assembleSupplySet([
      createSupplyMeasurement(importsKind, importsFact),
      createSupplyMeasurement(exportsKind, exportsFact),
    ])

    expect(assembled.ok).toBe(false)
  })
})