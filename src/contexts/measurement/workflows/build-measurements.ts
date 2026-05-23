import { unwrap } from '@/shared/maybe'
import { sequenceResults, mapError, mapResult, success, failure } from '@/shared/result'
import { ifElse, pipeWith } from '@/shared/fp'
import { binder } from '@/contexts/acl/eia-ingestion-acl/helpers/translatorPipeline'
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
    mapResult(mapError(parseDecimal(unwrap(_d.valueCandidate)), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-value' })), value => ({ d: _d, value }))

  const withUnit = (ctx: { d: InventoryBoundaryDto; value: number }) =>
    mapResult(mapError(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-unit' })), unit => ({ ...ctx, unit }))

  const withProduct = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown }) =>
    mapResult(mapError(parseInventoryProduct('CrudeOil'), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-product' })), product => ({ ...ctx, product }))

  const withKind = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown }) =>
    mapResult(mapError(parseMeasurementKind('CrudeStocks'), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-kind' })), kind => ({ ...ctx, kind }))

  const withSlice = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown; kind: unknown }) =>
    mapResult(mapError(parsePetroleumSlice('Inventory'), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-slice' })), slice => ({ ...ctx, slice }))

  const withGeo = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown; kind: unknown; slice: unknown }) =>
    mapResult(mapError(parseGeographyScope('USTotal'), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-geo' })), geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: InventoryBoundaryDto; value: number; unit: unknown; product: unknown; kind: unknown; slice: unknown; geo: unknown }) =>
    mapResult(mapError(parseSourceIdentity(d.source.endpoint), () => ({ kind: 'InvalidInventoryInput', input: 'invalid-source' })), source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: InventoryBoundaryDto; value: number; unit: MeasurementUnit; product: InventoryProduct; kind: MeasurementKind; slice: PetroleumSlice; geo: GeographyScope; source: SourceIdentity }) =>
    success(createInventoryMeasurement(ctx.product, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source))))

  const pipeline = pipeWith(
    <InputValue, FailureValue, OutputValue>(step: (value: InputValue) => Result<OutputValue, FailureValue>, result: Result<InputValue, FailureValue>) => binder(step, result),
    [withValue, withUnit, withProduct, withKind, withSlice, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildInventoryMeasurements = (
  reportWeek: ReportWeek,
  dtos: readonly InventoryBoundaryDto[],
): Result<readonly ReturnType<typeof createInventoryMeasurement>[], MeasurementBuilderError> =>
  mapError(sequenceResults(dtos.map(buildInventoryFromDto(reportWeek))), (e): MeasurementBuilderError => ({ kind: 'InvalidInventoryInput', input: String(e) }))

const buildPriceFromDto = (reportWeek: ReportWeek) => (d: PriceBoundaryDto): Result<ReturnType<typeof createPriceMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: PriceBoundaryDto) =>
    mapResult(mapError(parseDecimal(unwrap(_d.valueCandidate)), () => ({ kind: 'InvalidPriceInput', input: 'invalid-value' })), value => ({ d: _d, value }))

  const withUnit = (ctx: { d: PriceBoundaryDto; value: number }) =>
    mapResult(mapError(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), () => ({ kind: 'InvalidPriceInput', input: 'invalid-unit' })), unit => ({ ...ctx, unit }))

  const withSlice = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown }) =>
    mapResult(mapError(parsePetroleumSlice('Price'), () => ({ kind: 'InvalidPriceInput', input: 'invalid-slice' })), slice => ({ ...ctx, slice }))

  const withKind = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown }) =>
    mapResult(mapError(parseMeasurementKind('WTISpotPrice'), () => ({ kind: 'InvalidPriceInput', input: 'invalid-kind' })), kind => ({ ...ctx, kind }))

  const withPriceKind = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown; kind: unknown }) =>
    mapResult(mapError(parsePriceKind('WTISpot'), () => ({ kind: 'InvalidPriceInput', input: 'invalid-price-kind' })), priceKind => ({ ...ctx, priceKind }))

  const withGeo = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown; kind: unknown; priceKind: unknown }) =>
    mapResult(mapError(parseGeographyScope('USTotal'), () => ({ kind: 'InvalidPriceInput', input: 'invalid-geo' })), geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: PriceBoundaryDto; value: number; unit: unknown; slice: unknown; kind: unknown; priceKind: unknown; geo: unknown }) =>
    mapResult(mapError(parseSourceIdentity(d.source.endpoint), () => ({ kind: 'InvalidPriceInput', input: 'invalid-source' })), source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: PriceBoundaryDto; value: number; unit: MeasurementUnit; slice: PetroleumSlice; kind: MeasurementKind; priceKind: PriceKind; geo: GeographyScope; source: SourceIdentity }) =>
    success(createPriceMeasurement(ctx.priceKind, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source))))

  const pipeline = pipeWith(
    <InputValue, FailureValue, OutputValue>(step: (value: InputValue) => Result<OutputValue, FailureValue>, result: Result<InputValue, FailureValue>) => binder(step, result),
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
    (arr: readonly PriceBoundaryDto[]) => mapError(buildPriceFromDto(reportWeek)(arr[0]), (e): MeasurementBuilderError => ({ kind: 'InvalidPriceInput', input: String(e) })),
    () => failure<MeasurementBuilderError>({ kind: 'InvalidPriceInput', input: 'missing-price' }),
  )(dtos)

const buildRefineryFromDto = (reportWeek: ReportWeek) => (d: RefineryBoundaryDto): Result<ReturnType<typeof createRefineryMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: RefineryBoundaryDto) =>
    mapResult(mapError(parseDecimal(unwrap(_d.valueCandidate)), () => ({ kind: 'InvalidRefineryInput', input: 'invalid-value' })), value => ({ d: _d, value }))

  const withUnit = (ctx: { d: RefineryBoundaryDto; value: number }) =>
    mapResult(mapError(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), () => ({ kind: 'InvalidRefineryInput', input: 'invalid-unit' })), unit => ({ ...ctx, unit }))

  const withKind = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown }) =>
    mapResult(mapError(parseMeasurementKind(unwrap(ctx.d.measureKindCandidate)), () => ({ kind: 'InvalidRefineryInput', input: 'invalid-kind' })), kind => ({ ...ctx, kind }))

  const withSlice = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown; kind: unknown }) =>
    mapResult(mapError(parsePetroleumSlice('Refinery'), () => ({ kind: 'InvalidRefineryInput', input: 'invalid-slice' })), slice => ({ ...ctx, slice }))

  const withGeo = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown }) =>
    mapResult(mapError(parseGeographyScope(normalizeGeographyLabel(unwrap(ctx.d.geographyCandidate))), () => ({ kind: 'InvalidRefineryInput', input: 'invalid-geo' })), geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: RefineryBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown; geo: unknown }) =>
    mapResult(mapError(parseSourceIdentity(d.source.endpoint), () => ({ kind: 'InvalidRefineryInput', input: 'invalid-source' })), source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: RefineryBoundaryDto; value: number; unit: MeasurementUnit; kind: MeasurementKind; slice: PetroleumSlice; geo: GeographyScope; source: SourceIdentity }) =>
    mapError(
      parseRefineryMeasurement(createRefineryMeasurement(ctx.kind, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source)))),
      (): MeasurementBuilderError => ({ kind: 'InvalidRefineryInput', input: 'incompatible-refinery-fact' }),
    )

  const pipeline = pipeWith(
    <InputValue, FailureValue, OutputValue>(step: (value: InputValue) => Result<OutputValue, FailureValue>, result: Result<InputValue, FailureValue>) => binder(step, result),
    [withValue, withUnit, withKind, withSlice, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildRefineryMeasurements = (
  reportWeek: ReportWeek,
  dtos: readonly RefineryBoundaryDto[],
): Result<readonly ReturnType<typeof createRefineryMeasurement>[], MeasurementBuilderError> =>
  mapError(sequenceResults(dtos.map(buildRefineryFromDto(reportWeek))), (e): MeasurementBuilderError => ({ kind: 'InvalidRefineryInput', input: String(e) }))

const buildSupplyFromDto = (reportWeek: ReportWeek) => (d: SupplyBoundaryDto): Result<ReturnType<typeof createSupplyMeasurement>, MeasurementBuilderError> => {
  const withValue = (_d: SupplyBoundaryDto) =>
    mapResult(mapError(parseDecimal(unwrap(_d.valueCandidate)), () => ({ kind: 'InvalidSupplyInput', input: 'invalid-value' })), value => ({ d: _d, value }))

  const withUnit = (ctx: { d: SupplyBoundaryDto; value: number }) =>
    mapResult(mapError(parseMeasurementUnit(normalizeUnitLabel(unwrap(ctx.d.unitCandidate))), () => ({ kind: 'InvalidSupplyInput', input: 'invalid-unit' })), unit => ({ ...ctx, unit }))

  const withKind = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown }) =>
    mapResult(mapError(parseMeasurementKind(unwrap(ctx.d.measureKindCandidate)), () => ({ kind: 'InvalidSupplyInput', input: 'invalid-kind' })), kind => ({ ...ctx, kind }))

  const withSlice = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown; kind: unknown }) =>
    mapResult(mapError(parsePetroleumSlice('Supply'), () => ({ kind: 'InvalidSupplyInput', input: 'invalid-slice' })), slice => ({ ...ctx, slice }))

  const withGeo = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown }) =>
    mapResult(mapError(parseGeographyScope(normalizeGeographyLabel(unwrap(ctx.d.geographyCandidate))), () => ({ kind: 'InvalidSupplyInput', input: 'invalid-geo' })), geo => ({ ...ctx, geo }))

  const withSource = (ctx: { d: SupplyBoundaryDto; value: number; unit: unknown; kind: unknown; slice: unknown; geo: unknown }) =>
    mapResult(mapError(parseSourceIdentity(d.source.endpoint), () => ({ kind: 'InvalidSupplyInput', input: 'invalid-source' })), source => ({ ...ctx, source }))

  const createMeasurementStep = (ctx: { d: SupplyBoundaryDto; value: number; unit: MeasurementUnit; kind: MeasurementKind; slice: PetroleumSlice; geo: GeographyScope; source: SourceIdentity }) =>
    mapError(
      parseSupplyMeasurement(createSupplyMeasurement(ctx.kind, createWeeklyFact(reportWeek, ctx.geo, ctx.slice, ctx.kind, ctx.value, ctx.unit, some(ctx.source)))),
      (): MeasurementBuilderError => ({ kind: 'InvalidSupplyInput', input: 'incompatible-supply-fact' }),
    )

  const pipeline = pipeWith(
    <InputValue, FailureValue, OutputValue>(step: (value: InputValue) => Result<OutputValue, FailureValue>, result: Result<InputValue, FailureValue>) => binder(step, result),
    [withValue, withUnit, withKind, withSlice, withGeo, withSource, createMeasurementStep],
  )

  return pipeline(d)
}

export const buildSupplyMeasurements = (
  reportWeek: ReportWeek,
  dtos: readonly SupplyBoundaryDto[],
): Result<readonly ReturnType<typeof createSupplyMeasurement>[], MeasurementBuilderError> =>
  mapError(sequenceResults(dtos.map(buildSupplyFromDto(reportWeek))), (e): MeasurementBuilderError => ({ kind: 'InvalidSupplyInput', input: String(e) }))

export type { MeasurementBuilderError }

export default buildInventoryMeasurements
