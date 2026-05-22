import { allPass, ifElse, pipeWith } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
import type { ReportWeek } from './report-week'
import { formatReportWeekIso } from './report-week'
import type { GeographyScope } from './geography-scope'
import { formatGeographyScope } from './geography-scope'
import type { InventoryMeasurement } from './inventory-measurement'
import type { PriceMeasurement } from './price-measurement'

const weeklyPetroleumFactsBrand = Symbol('WeeklyPetroleumFacts')

export type WeeklyPetroleumFacts = Readonly<{
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly inventories: readonly InventoryMeasurement[]
  readonly price: PriceMeasurement
  readonly [weeklyPetroleumFactsBrand]: true
}>

export type WeeklyPetroleumFactsError =
  | { readonly kind: 'MissingRequiredMeasurement'; readonly missing: 'inventory' | 'price' }
  | { readonly kind: 'ReportWeekMismatch'; readonly input: string }
  | { readonly kind: 'GeographyMismatch'; readonly input: string }
  | { readonly kind: 'DuplicateObservation'; readonly input: string }

const hasWeeklyPetroleumFactsBrand = hasBrand(weeklyPetroleumFactsBrand)

const createWeeklyPetroleumFacts = (
  reportWeek: ReportWeek,
  geography: GeographyScope,
  inventories: readonly InventoryMeasurement[],
  price: PriceMeasurement,
): WeeklyPetroleumFacts => ({
  reportWeek,
  geography,
  inventories,
  price,
  [weeklyPetroleumFactsBrand]: true,
  ...brand(weeklyPetroleumFactsBrand),
})

const makeMissingError = (m: 'inventory' | 'price'): WeeklyPetroleumFactsError => ({ kind: 'MissingRequiredMeasurement', missing: m })

const makeReportWeekMismatch = (input: unknown): WeeklyPetroleumFactsError => ({ kind: 'ReportWeekMismatch', input: String(input) })

const makeGeographyMismatch = (input: unknown): WeeklyPetroleumFactsError => ({ kind: 'GeographyMismatch', input: String(input) })

const makeDuplicateObservation = (input: unknown): WeeklyPetroleumFactsError => ({ kind: 'DuplicateObservation', input: String(input) })

export const assembleWeeklyPetroleumFacts = (
  inventories: readonly InventoryMeasurement[],
  prices: readonly PriceMeasurement[],
): Result<WeeklyPetroleumFacts, WeeklyPetroleumFactsError> => {
  type Ctx = { inventories: readonly InventoryMeasurement[]; prices: readonly PriceMeasurement[] }

  const ctx0: Ctx = { inventories, prices }

  const stepNonEmptyInventories = (c: Ctx) => ifElse((v: Ctx) => v.inventories.length === 0, () => failure(makeMissingError('inventory')), () => success(c))(c)

  const stepNonEmptyPrices = (c: Ctx) => ifElse((v: Ctx) => v.prices.length === 0, () => failure(makeMissingError('price')), () => success(c))(c)

  const stepReportWeekAligned = (c: Ctx) =>
    ifElse(reportWeeksMisaligned, buildReportWeekMismatch, () => success(c))(c)

  const stepGeographyAligned = (c: Ctx) => ifElse(geographiesMisaligned, buildGeographyMismatch, () => success(c))(c)

  const stepNoDuplicateInventories = (c: Ctx) => ifElse(inventoryDuplicatesExist, buildInventoryDuplicateError, () => success(c))(c)

  function reportWeeksMisaligned(v: Ctx): boolean {
    const allReportWeeks = [...v.inventories.map(i => formatReportWeekIso(i.fact.reportWeek)), ...v.prices.map(p => formatReportWeekIso(p.fact.reportWeek))]
    return Array.from(new Set(allReportWeeks)).length !== 1
  }

  function buildReportWeekMismatch(v: Ctx) {
    return failure(makeReportWeekMismatch([...v.inventories.map(i => formatReportWeekIso(i.fact.reportWeek)), ...v.prices.map(p => formatReportWeekIso(p.fact.reportWeek))].join(',')))
  }

  function geographiesMisaligned(v: Ctx): boolean {
    const allGeographies = [...v.inventories.map(i => formatGeographyScope(i.fact.geography)), ...v.prices.map(p => formatGeographyScope(p.fact.geography))]
    return Array.from(new Set(allGeographies)).length !== 1
  }

  function buildGeographyMismatch(v: Ctx) {
    return failure(makeGeographyMismatch([...v.inventories.map(i => formatGeographyScope(i.fact.geography)), ...v.prices.map(p => formatGeographyScope(p.fact.geography))].join(',')))
  }

  function inventoryDuplicatesExist(v: Ctx): boolean {
    const inventoryKeys = v.inventories.map(i => `${formatReportWeekIso(i.fact.reportWeek)}|${formatGeographyScope(i.fact.geography)}|${String(getKey('product')(i.product))}`)
    return inventoryKeys.some((k, idx) => inventoryKeys.indexOf(k) !== idx)
  }

  function buildInventoryDuplicateError(v: Ctx) {
    const inventoryKeys = v.inventories.map(i => `${formatReportWeekIso(i.fact.reportWeek)}|${formatGeographyScope(i.fact.geography)}|${String(getKey('product')(i.product))}`)
    const duplicates = inventoryKeys.filter((k, idx) => inventoryKeys.indexOf(k) !== idx)
    return failure(makeDuplicateObservation(duplicates.join(',')))
  }

  const stepSinglePrice = (c: Ctx) => ifElse((v: Ctx) => v.prices.length > 1, () => failure(makeDuplicateObservation('multiple-prices')), () => success(c))(c)

  const finalStep = (c: Ctx) => success(createWeeklyPetroleumFacts(c.inventories[0].fact.reportWeek, c.inventories[0].fact.geography, c.inventories, c.prices[0]))

  const pipeline = pipeWith(<I, F, O>(step: (v: I) => Result<O, F>, r: Result<I, F>) => binder(step, r), [
    stepNonEmptyInventories,
    stepNonEmptyPrices,
    stepReportWeekAligned,
    stepGeographyAligned,
    stepNoDuplicateInventories,
    stepSinglePrice,
    finalStep,
  ])

  return pipeline(ctx0)
}

export const isWeeklyPetroleumFacts = (input: unknown): input is WeeklyPetroleumFacts =>
  ifElse(isObjectInput, allPass([hasWeeklyPetroleumFactsBrand]), () => false)(input)

export const parseWeeklyPetroleumFacts = (
  input: unknown,
): Result<WeeklyPetroleumFacts, WeeklyPetroleumFactsError> =>
  ifElse(
    isWeeklyPetroleumFacts,
    (candidate: WeeklyPetroleumFacts) => success(candidate),
    () => failure(makeMissingError('inventory')),
  )(input)

export default assembleWeeklyPetroleumFacts
