import { unwrap } from '@/shared/maybe'
import { bindResultStep, sequenceResults, mapError, mapResult, success, failure } from '@/shared/result'
import { ifElse, pipeWith } from '@/shared/fp'
import type { Result } from '@/shared/result'
import type { InventoryBoundaryDto, PriceBoundaryDto, RefineryBoundaryDto, SupplyBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { parseDecimal } from '@/shared/decimal'
import { parseMeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import type { MeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import { parseMeasurementKind } from '@/contexts/measurement/model/measurement-kind'
import type { MeasurementKind } from '@/contexts/measurement/model/measurement-kind'
import { parseInventoryProduct } from '@/contexts/measurement/model/inventory-product'
import type { InventoryProduct } from '@/contexts/measurement/model/inventory-product'
import { parsePetroleumSlice } from '@/contexts/measurement/model/petroleum-slice'
import type { PetroleumSlice } from '@/contexts/measurement/model/petroleum-slice'
import { parseGeographyScope } from '@/contexts/measurement/model/geography-scope'
import type { GeographyScope } from '@/contexts/measurement/model/geography-scope'
import { parseSourceIdentity } from '@/contexts/measurement/model/source-identity'
import type { SourceIdentity } from '@/contexts/measurement/model/source-identity'
import { some } from '@/shared/maybe'
import { parsePriceKind } from '@/contexts/measurement/model/price-kind'
import type { PriceKind } from '@/contexts/measurement/model/price-kind'
import { createWeeklyFact } from '@/contexts/measurement/model/weekly-fact'
import { createInventoryMeasurement } from '@/contexts/measurement/model/inventory-measurement'
import { createPriceMeasurement } from '@/contexts/measurement/model/price-measurement'
import { createRefineryMeasurement, parseRefineryMeasurement } from '@/contexts/measurement/model/refinery-measurement'
import { createSupplyMeasurement, parseSupplyMeasurement } from '@/contexts/measurement/model/supply-measurement'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'


type MeasurementBuilderError = Readonly<{ readonly kind: 'InvalidInventoryInput' | 'InvalidPriceInput' | 'InvalidRefineryInput' | 'InvalidSupplyInput'; readonly input: string }>

// Note: avoid heterogenous `sequenceResults` usage to preserve strong types.
type MeasurementBuilderErrorKind = MeasurementBuilderError['kind']

const unitLabels: Record<string, string> = {
  MBBL: 'ThousandBarrels',
  'MBBL/D': 'ThousandBarrelsPerDay',
  PCT: 'Percent',
  '%': 'Percent',
  'USD/bbl': 'USDPerBarrel',
  'USDPerBarrel': 'USDPerBarrel',
}

const geographyLabels: Record<string, string> = {
  US: 'USTotal',
  USA: 'USTotal',
  'U.S.': 'USTotal',
  'United States': 'USTotal',
  USTotal: 'USTotal',
}

const makeBuilderError = (kind: MeasurementBuilderErrorKind, input: string): MeasurementBuilderError => ({ kind, input })

const mapParsedValue = <ParsedValue, NextValue>(
  parsedResult: Result<ParsedValue, unknown>,
  kind: MeasurementBuilderErrorKind,
  input: string,
  toNextValue: (value: ParsedValue) => NextValue,
): Result<NextValue, MeasurementBuilderError> =>
  mapResult(
    mapError(parsedResult, () => makeBuilderError(kind, input)),
    toNextValue,
  )

const normalizeUnitLabel = (input: unknown): string =>
  ifElse(
    (s: string) => Object.prototype.hasOwnProperty.call(unitLabels, s),
    (s: string) => unitLabels[s],
    (s: string) => s,
  )(String(input))

const normalizeGeographyLabel = (input: unknown): string =>
  ifElse(
    (s: string) => Object.prototype.hasOwnProperty.call(geographyLabels, s),
    (s: string) => geographyLabels[s],
    (s: string) => s,
  )(String(input))

const buildInventoryFromDto = (reportWeek: ReportWeek) => (d: InventoryBoundaryDto): Result<ReturnType<typeof createInventoryMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: InventoryBoundaryDto) =>
    mapParsedValue(parseDecimal(unwrap(_d.valueCandidate)), 'InvalidInventoryInput', 'invalid-value', value => ({ d: _d, value }))

  const withUnit = (ctx: { d: InventoryBoundaryDto; value: number }) =>
    mapParsedValue(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), 'InvalidInventoryInput', 'invalid-unit', unit => ({ ...ctx, unit }))

  const withProduct = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown }) =>
    mapParsedValue(parseInventoryProduct('CrudeOil'), 'InvalidInventoryInput', 'invalid-product', product => ({ ...ctx, product }))

  const withKind = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown }) =>
    mapParsedValue(parseMeasurementKind('CrudeStocks'), 'InvalidInventoryInput', 'invalid-kind', kind => ({ ...ctx, kind }))

  const withSlice = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown; kind: unknown }) =>
    mapParsedValue(parsePetroleumSlice('Inventory'), 'InvalidInventoryInput', 'invalid-slice', slice => ({ ...ctx, slice }))

  const withGeo = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown; kind: unknown; slice: unknown }) =>
    mapParsedValue(parseGeographyScope('USTotal'), 'InvalidInventoryInput', 'invalid-geo', geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown; kind: unknown; slice: unknown; geo: unknown }) =>
    mapParsedValue(parseSourceIdentity(d.source.endpoint), 'InvalidInventoryInput', 'invalid-source', source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: InventoryBoundaryDto; value: number; unit: MeasurementUnit; product: InventoryProduct; kind: MeasurementKind; slice: PetroleumSlice; geo: GeographyScope; source: SourceIdentity }) =>
    success(createInventoryMeasurement(ctx.product, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source))))

  const pipeline = pipeWith(
    bindResultStep,
    [withValue, withUnit, withProduct, withKind, withSlice, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildInventoryMeasurements = (
  reportWeek: ReportWeek,
  dtos: readonly InventoryBoundaryDto[],
): Result<readonly ReturnType<typeof createInventoryMeasurement>[], MeasurementBuilderError> =>
  mapError(sequenceResults(dtos.map(buildInventoryFromDto(reportWeek))), (e): MeasurementBuilderError => makeBuilderError('InvalidInventoryInput', String(e)))

const buildPriceFromDto = (reportWeek: ReportWeek) => (d: PriceBoundaryDto): Result<ReturnType<typeof createPriceMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: PriceBoundaryDto) =>
    mapParsedValue(parseDecimal(unwrap(_d.valueCandidate)), 'InvalidPriceInput', 'invalid-value', value => ({ d: _d, value }))

  const withUnit = (ctx: { d: PriceBoundaryDto; value: number }) =>
    mapParsedValue(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), 'InvalidPriceInput', 'invalid-unit', unit => ({ ...ctx, unit }))

  const withSlice = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown }) =>
    mapParsedValue(parsePetroleumSlice('Price'), 'InvalidPriceInput', 'invalid-slice', slice => ({ ...ctx, slice }))

  const withKind = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown }) =>
    mapParsedValue(parseMeasurementKind('WTISpotPrice'), 'InvalidPriceInput', 'invalid-kind', kind => ({ ...ctx, kind }))

  const withPriceKind = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown; kind: unknown }) =>
    mapParsedValue(parsePriceKind('WTISpot'), 'InvalidPriceInput', 'invalid-price-kind', priceKind => ({ ...ctx, priceKind }))

  const withGeo = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown; kind: unknown; priceKind: unknown }) =>
    mapParsedValue(parseGeographyScope('USTotal'), 'InvalidPriceInput', 'invalid-geo', geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown; kind: unknown; priceKind: unknown; geo: unknown }) =>
    mapParsedValue(parseSourceIdentity(d.source.endpoint), 'InvalidPriceInput', 'invalid-source', source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: PriceBoundaryDto; value: number; unit: MeasurementUnit; slice: PetroleumSlice; kind: MeasurementKind; priceKind: PriceKind; geo: GeographyScope; source: SourceIdentity }) =>
    success(createPriceMeasurement(ctx.priceKind, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source))))

  const pipeline = pipeWith(
    bindResultStep,
    [withValue, withUnit, withSlice, withKind, withPriceKind, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildPriceMeasurement = (
  reportWeek: ReportWeek,
  dtos: readonly PriceBoundaryDto[],
): Result<ReturnType<typeof createPriceMeasurement>, MeasurementBuilderError> =>
  ifElse(
    (arr: readonly PriceBoundaryDto[]) => arr.length > 0,
    (arr: readonly PriceBoundaryDto[]) => mapError(buildPriceFromDto(reportWeek)(arr[0]), (e): MeasurementBuilderError => makeBuilderError('InvalidPriceInput', String(e))),
    () => failure<MeasurementBuilderError>(makeBuilderError('InvalidPriceInput', 'missing-price')),
  )(dtos)

const buildRefineryFromDto = (reportWeek: ReportWeek) => (d: RefineryBoundaryDto): Result<ReturnType<typeof createRefineryMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: RefineryBoundaryDto) =>
    mapParsedValue(parseDecimal(unwrap(_d.valueCandidate)), 'InvalidRefineryInput', 'invalid-value', value => ({ d: _d, value }))

  const withUnit = (ctx: { d: RefineryBoundaryDto; value: number }) =>
    mapParsedValue(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), 'InvalidRefineryInput', 'invalid-unit', unit => ({ ...ctx, unit }))

  const withKind = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown }) =>
    mapParsedValue(parseMeasurementKind(unwrap(ctx.d.measureKindCandidate)), 'InvalidRefineryInput', 'invalid-kind', kind => ({ ...ctx, kind }))

  const withSlice = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown; kind: unknown }) =>
    mapParsedValue(parsePetroleumSlice('Refinery'), 'InvalidRefineryInput', 'invalid-slice', slice => ({ ...ctx, slice }))

  const withGeo = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown }) =>
    mapParsedValue(parseGeographyScope(normalizeGeographyLabel(unwrap(ctx.d.geographyCandidate))), 'InvalidRefineryInput', 'invalid-geo', geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown; geo: unknown }) =>
    mapParsedValue(parseSourceIdentity(d.source.endpoint), 'InvalidRefineryInput', 'invalid-source', source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: RefineryBoundaryDto; value: number; unit: MeasurementUnit; kind: MeasurementKind; slice: PetroleumSlice; geo: GeographyScope; source: SourceIdentity }) =>
    mapError(
      parseRefineryMeasurement(createRefineryMeasurement(ctx.kind, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source)))),
      (): MeasurementBuilderError => makeBuilderError('InvalidRefineryInput', 'incompatible-refinery-fact'),
    )

  const pipeline = pipeWith(
    bindResultStep,
    [withValue, withUnit, withKind, withSlice, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildRefineryMeasurements = (
  reportWeek: ReportWeek,
  dtos: readonly RefineryBoundaryDto[],
): Result<readonly ReturnType<typeof createRefineryMeasurement>[], MeasurementBuilderError> =>
  mapError(sequenceResults(dtos.map(buildRefineryFromDto(reportWeek))), (e): MeasurementBuilderError => makeBuilderError('InvalidRefineryInput', String(e)))

const buildSupplyFromDto = (reportWeek: ReportWeek) => (d: SupplyBoundaryDto): Result<ReturnType<typeof createSupplyMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: SupplyBoundaryDto) =>
    mapParsedValue(parseDecimal(unwrap(_d.valueCandidate)), 'InvalidSupplyInput', 'invalid-value', value => ({ d: _d, value }))

  const withUnit = (ctx: { d: SupplyBoundaryDto; value: number }) =>
    mapParsedValue(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), 'InvalidSupplyInput', 'invalid-unit', unit => ({ ...ctx, unit }))

  const withKind = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown }) =>
    mapParsedValue(parseMeasurementKind(unwrap(ctx.d.measureKindCandidate)), 'InvalidSupplyInput', 'invalid-kind', kind => ({ ...ctx, kind }))

  const withSlice = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown; kind: unknown }) =>
    mapParsedValue(parsePetroleumSlice('Supply'), 'InvalidSupplyInput', 'invalid-slice', slice => ({ ...ctx, slice }))

  const withGeo = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown }) =>
    mapParsedValue(parseGeographyScope(normalizeGeographyLabel(unwrap(ctx.d.geographyCandidate))), 'InvalidSupplyInput', 'invalid-geo', geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown; geo: unknown }) =>
    mapParsedValue(parseSourceIdentity(d.source.endpoint), 'InvalidSupplyInput', 'invalid-source', source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: SupplyBoundaryDto; value: number; unit: MeasurementUnit; kind: MeasurementKind; slice: PetroleumSlice; geo: GeographyScope; source: SourceIdentity }) =>
    mapError(
      parseSupplyMeasurement(createSupplyMeasurement(ctx.kind, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source)))),
      (): MeasurementBuilderError => makeBuilderError('InvalidSupplyInput', 'incompatible-supply-fact'),
    )

  const pipeline = pipeWith(
    bindResultStep,
    [withValue, withUnit, withKind, withSlice, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildSupplyMeasurements = (
  reportWeek: ReportWeek,
  dtos: readonly SupplyBoundaryDto[],
): Result<readonly ReturnType<typeof createSupplyMeasurement>[], MeasurementBuilderError> =>
  mapError(sequenceResults(dtos.map(buildSupplyFromDto(reportWeek))), (e): MeasurementBuilderError => makeBuilderError('InvalidSupplyInput', String(e)))

export type { MeasurementBuilderError }

export default buildInventoryMeasurements
