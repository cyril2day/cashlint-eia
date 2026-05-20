import type { RawEiaRow, PeriodCandidate, ValueCandidate, MaybeString } from './raw-eia'
import type { Maybe } from '@/shared/maybe'
import { some } from '@/shared/maybe'

export type InventoryBoundaryDto = Readonly<{
  readonly kind: 'Inventory'
  readonly periodCandidate: Maybe<PeriodCandidate>
  readonly seriesId: MaybeString
  readonly valueCandidate: Maybe<ValueCandidate>
  readonly unitCandidate: MaybeString
  readonly source: { endpoint: string }
}>

export type PriceBoundaryDto = Readonly<{
  readonly kind: 'Price'
  readonly periodCandidate: Maybe<PeriodCandidate>
  readonly seriesId: MaybeString
  readonly measureKindCandidate: MaybeString
  readonly valueCandidate: Maybe<ValueCandidate>
  readonly unitCandidate: MaybeString
  readonly source: { endpoint: string }
}>

export type BoundaryDto = InventoryBoundaryDto | PriceBoundaryDto

export type TrustedBoundaryInput = Readonly<{
  readonly inputs: readonly BoundaryDto[]
}>

export const fromRawInventoryRow = (r: RawEiaRow): InventoryBoundaryDto => {
  const periodCandidate = r.period
  const seriesId = r.series_id
  const valueCandidate = r.value
  const unitCandidate = r.unit
  const source = { endpoint: 'eia' }

  return {
    kind: 'Inventory',
    periodCandidate,
    seriesId,
    valueCandidate,
    unitCandidate,
    source,
  }
}

export const fromRawPriceRow = (r: RawEiaRow): PriceBoundaryDto => {
  const periodCandidate = r.period
  const seriesId = r.series_id
  const measureKindCandidate = some('WTISpotPrice')
  const valueCandidate = r.value
  const unitCandidate = r.unit
  const source = { endpoint: 'eia' }

  return {
    kind: 'Price',
    periodCandidate,
    seriesId,
    measureKindCandidate,
    valueCandidate,
    unitCandidate,
    source,
  }
}