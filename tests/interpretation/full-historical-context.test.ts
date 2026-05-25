import { describe, expect, it } from 'vitest'

import {
  parseComparisonWindow,
  parseGeographyScope,
  parseInventoryProduct,
  parseMeasurementKind,
  parseMeasurementUnit,
  parsePetroleumSlice,
  parsePriceKind,
  parseReportWeek,
  parseTrendDirection,
} from '@/contexts/measurement/model'
import {
  calculateBaseline,
  calculateTrend,
  contextualizeFullSignal,
  contextualizeFullSignalSet,
  createHistoricalObservation,
  createHistoricalSeries,
  createInventorySignal,
  createInventorySignalIdentity,
  createPriceSignal,
  createPriceSignalIdentity,
  createCoreWeeklyInterpretationPolicies,
  detectAnomaly,
  validateHistoricalSeries,
  type HistoricalSeries,
  type HistoricalSignalSet,
  type Signal,
} from '@/contexts/interpretation'
import { ifElse } from '@/shared/fp'
import type { Result } from '@/shared/result'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === true,
    (candidate: Result<SuccessValue, FailureValue>): SuccessValue => Reflect.get(candidate, 'value'),
    (): SuccessValue => {
      throw new Error('expected success')
    },
  )(result)

const geography = () => unwrapSuccess(parseGeographyScope('USTotal'))
const inventoryProduct = () => unwrapSuccess(parseInventoryProduct('CrudeOil'))
const inventoryKind = () => unwrapSuccess(parseMeasurementKind('CrudeStocks'))
const inventorySlice = () => unwrapSuccess(parsePetroleumSlice('Inventory'))
const inventoryUnit = () => unwrapSuccess(parseMeasurementUnit('ThousandBarrels'))
const priceKind = () => unwrapSuccess(parsePriceKind('WTISpot'))
const priceMeasurementKind = () => unwrapSuccess(parseMeasurementKind('WTISpotPrice'))
const priceSlice = () => unwrapSuccess(parsePetroleumSlice('Price'))
const priceUnit = () => unwrapSuccess(parseMeasurementUnit('USDPerBarrel'))
const week = (value: string) => unwrapSuccess(parseReportWeek(value))

const inventoryIdentity = () =>
  createInventorySignalIdentity(geography(), inventoryKind(), inventorySlice(), inventoryProduct())

const inventorySignal = (value: number): Signal =>
  createInventorySignal(
    inventoryIdentity(),
    week('2026-05-19T00:00:00.000Z'),
    geography(),
    value,
    inventoryUnit(),
    inventorySlice(),
  )

const observation = (date: string, value: number) =>
  createHistoricalObservation(inventoryIdentity(), week(date), value, inventoryUnit())

const priceIdentity = () =>
  createPriceSignalIdentity(geography(), priceMeasurementKind(), priceSlice(), priceKind())

const priceObservation = (date: string, value: number) =>
  createHistoricalObservation(priceIdentity(), week(date), value, priceUnit())

const history = (values: readonly number[]): HistoricalSeries =>
  createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
    observation('2026-05-12T00:00:00.000Z', values[0]),
    observation('2026-05-05T00:00:00.000Z', values[1]),
    observation('2026-04-28T00:00:00.000Z', values[2]),
    observation('2026-04-21T00:00:00.000Z', values[3]),
  ])

const thinPriceHistory = (): HistoricalSeries =>
  createHistoricalSeries(priceIdentity(), priceUnit(), [
    priceObservation('2026-05-12T00:00:00.000Z', 75),
  ])

const priceSignal = (value: number): Signal =>
  createPriceSignal(
    priceIdentity(),
    week('2026-05-19T00:00:00.000Z'),
    geography(),
    value,
    priceUnit(),
    priceSlice(),
  )

const oneWeekPolicy = () =>
  createCoreWeeklyInterpretationPolicies(unwrapSuccess(parseComparisonWindow('OneWeek')), 1, 1)

const twoWeekPolicy = () =>
  createCoreWeeklyInterpretationPolicies(unwrapSuccess(parseComparisonWindow('TwoWeek')), 1, 1)

const fourWeekPolicy = () =>
  createCoreWeeklyInterpretationPolicies(unwrapSuccess(parseComparisonWindow('FourWeek')), 1, 1)

describe('HistoricalSeries validation', () => {
  it('accepts ordered compatible history and rejects duplicate, identity, unit, ordering, and coverage failures', () => {
    const valid = history([100, 99, 98, 97])
    const priceIdentity = createPriceSignalIdentity(
      geography(),
      unwrapSuccess(parseMeasurementKind('WTISpotPrice')),
      unwrapSuccess(parsePetroleumSlice('Price')),
      unwrapSuccess(parsePriceKind('WTISpot')),
    )
    const duplicate = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
      observation('2026-05-12T00:00:00.000Z', 100),
      observation('2026-05-12T00:00:00.000Z', 99),
    ])
    const identityMismatch = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
      createHistoricalObservation(priceIdentity, week('2026-05-12T00:00:00.000Z'), 72, inventoryUnit()),
    ])
    const unitMismatch = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
      createHistoricalObservation(inventoryIdentity(), week('2026-05-12T00:00:00.000Z'), 100, unwrapSuccess(parseMeasurementUnit('MillionBarrels'))),
    ])
    const invalidOrder = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
      observation('2026-05-05T00:00:00.000Z', 100),
      observation('2026-05-12T00:00:00.000Z', 99),
    ])
    const insufficient = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [])

    expect(validateHistoricalSeries(valid, oneWeekPolicy()).ok).toBe(true)
    expect(validateHistoricalSeries(duplicate, oneWeekPolicy())).toMatchObject({ ok: false, error: { kind: 'DuplicateObservation' } })
    expect(validateHistoricalSeries(identityMismatch, oneWeekPolicy())).toMatchObject({ ok: false, error: { kind: 'SignalIdentityMismatch' } })
    expect(validateHistoricalSeries(unitMismatch, oneWeekPolicy())).toMatchObject({ ok: false, error: { kind: 'IncompatibleUnits' } })
    expect(validateHistoricalSeries(invalidOrder, oneWeekPolicy())).toMatchObject({ ok: false, error: { kind: 'HistoricalSeriesInvalid' } })
    expect(validateHistoricalSeries(insufficient, oneWeekPolicy())).toMatchObject({ ok: false, error: { kind: 'InsufficientHistory' } })
  })
})

describe('Trend, baseline, and anomaly interpretation', () => {
  it('calculates one-week, two-week, and four-week trend from historical series', () => {
    const signal = inventorySignal(110)
    const upDirection = unwrapSuccess(parseTrendDirection('Up'))

    expect(unwrapSuccess(calculateTrend(signal, history([100, 99, 98, 97]), oneWeekPolicy())).direction).toEqual(upDirection)
    expect(unwrapSuccess(calculateTrend(signal, history([100, 95, 98, 97]), twoWeekPolicy())).magnitude).toBe(15)
    expect(unwrapSuccess(calculateTrend(signal, history([100, 99, 98, 90]), fourWeekPolicy())).magnitude).toBe(20)
  })

  it('calculates baseline and detects normal, high, low, and not-computed anomaly states', () => {
    const series = history([100, 102, 98, 100])
    const baseline = unwrapSuccess(calculateBaseline(series, oneWeekPolicy()))
    const computedBaseline = ifElse(
      (value: typeof baseline) => value.kind === 'Computed',
      value => Reflect.get(value, 'baseline'),
      () => {
        throw new Error('expected computed baseline')
      },
    )(baseline)
    const normal = unwrapSuccess(detectAnomaly(inventorySignal(101), computedBaseline, oneWeekPolicy()))
    const high = unwrapSuccess(detectAnomaly(inventorySignal(110), computedBaseline, oneWeekPolicy()))
    const low = unwrapSuccess(detectAnomaly(inventorySignal(90), computedBaseline, oneWeekPolicy()))
    const flatBaseline = unwrapSuccess(calculateBaseline(history([100, 100, 100, 100]), oneWeekPolicy()))
    const flatComputed = ifElse(
      (value: typeof flatBaseline) => value.kind === 'Computed',
      value => Reflect.get(value, 'baseline'),
      () => {
        throw new Error('expected computed baseline')
      },
    )(flatBaseline)

    expect(computedBaseline.average).toBe(100)
    expect(normal.kind).toBe('Normal')
    expect(high).toMatchObject({ kind: 'Anomalous', direction: 'HighSide' })
    expect(low).toMatchObject({ kind: 'Anomalous', direction: 'LowSide' })
    expect(unwrapSuccess(detectAnomaly(inventorySignal(100), flatComputed, oneWeekPolicy())).kind).toBe('NotComputed')
  })

  it('returns NotComputed baseline when policy allows insufficient baseline history', () => {
    const shortHistory = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
      observation('2026-05-12T00:00:00.000Z', 100),
    ])

    expect(unwrapSuccess(calculateBaseline(shortHistory, oneWeekPolicy()))).toMatchObject({ kind: 'NotComputed' })
  })
})

describe('Full contextualized signal interpretation', () => {
  it('produces trend, baseline, anomaly, and caveats for full historical context', () => {
    const contextualized = unwrapSuccess(contextualizeFullSignal(inventorySignal(110), history([100, 102, 98, 100]), oneWeekPolicy()))

    expect(contextualized.trend.kind).toBe('Some')
    expect(contextualized.baseline.kind).toBe('Computed')
    expect(contextualized.anomaly.kind).toBe('Anomalous')
    expect(contextualized.caveats.length).toBe(0)
  })

  it('preserves partial NotComputed states and caveats when history is thin', () => {
    const thinHistory = createHistoricalSeries(inventoryIdentity(), inventoryUnit(), [
      observation('2026-05-12T00:00:00.000Z', 100),
    ])
    const contextualized = unwrapSuccess(contextualizeFullSignal(inventorySignal(101), thinHistory, oneWeekPolicy()))

    expect(contextualized.trend.kind).toBe('Some')
    expect(contextualized.baseline.kind).toBe('NotComputed')
    expect(contextualized.anomaly.kind).toBe('NotComputed')
    expect(contextualized.caveats.map(caveat => caveat.kind)).toContain('BaselineNotComputed')
  })

  it('contextualizes a full signal set and preserves per-signal caveats', () => {
    const signals = {
      inventory: inventorySignal(110),
      price: priceSignal(70),
    }
    const seriesSet: HistoricalSignalSet = {
      inventory: history([100, 102, 98, 100]),
      price: thinPriceHistory(),
    }

    const contextualized = unwrapSuccess(contextualizeFullSignalSet(signals, seriesSet, oneWeekPolicy()))

    expect(contextualized.inventory.baseline.kind).toBe('Computed')
    expect(contextualized.inventory.anomaly.kind).toBe('Anomalous')
    expect(contextualized.price.baseline.kind).toBe('NotComputed')
    expect(contextualized.price.anomaly.kind).toBe('NotComputed')
    expect(contextualized.price.caveats.map(caveat => caveat.kind)).toContain('BaselineNotComputed')
  })
})
