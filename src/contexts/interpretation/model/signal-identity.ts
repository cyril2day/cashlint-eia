import { brand } from '@/shared/domain'
import { ifElse } from '@/shared/fp'
import { formatGeographyScope, type GeographyScope } from '@/contexts/measurement/model/geography-scope'
import { formatMeasurementKind, type MeasurementKind } from '@/contexts/measurement/model/measurement-kind'
import { formatInventoryProduct, type InventoryProduct } from '@/contexts/measurement/model/inventory-product'
import { formatPriceKind, type PriceKind } from '@/contexts/measurement/model/price-kind'
import { formatPetroleumSlice, type PetroleumSlice } from '@/contexts/measurement/model/petroleum-slice'

const signalIdentityBrand = Symbol('SignalIdentity')

export type InventorySignalIdentity = Readonly<{
  readonly kind: 'Inventory'
  readonly geography: GeographyScope
  readonly measurementKind: MeasurementKind
  readonly sourceKind: PetroleumSlice
  readonly inventoryProduct: InventoryProduct
  readonly [signalIdentityBrand]: true
}>

export type PriceSignalIdentity = Readonly<{
  readonly kind: 'Price'
  readonly geography: GeographyScope
  readonly measurementKind: MeasurementKind
  readonly sourceKind: PetroleumSlice
  readonly priceKind: PriceKind
  readonly [signalIdentityBrand]: true
}>

export type SignalIdentity = InventorySignalIdentity | PriceSignalIdentity

export const createInventorySignalIdentity = (
  geography: GeographyScope,
  measurementKind: MeasurementKind,
  sourceKind: PetroleumSlice,
  inventoryProduct: InventoryProduct,
): InventorySignalIdentity => ({
  kind: 'Inventory',
  geography,
  measurementKind,
  sourceKind,
  inventoryProduct,
  [signalIdentityBrand]: true,
  ...brand(signalIdentityBrand),
})

export const createPriceSignalIdentity = (
  geography: GeographyScope,
  measurementKind: MeasurementKind,
  sourceKind: PetroleumSlice,
  priceKind: PriceKind,
): PriceSignalIdentity => ({
  kind: 'Price',
  geography,
  measurementKind,
  sourceKind,
  priceKind,
  [signalIdentityBrand]: true,
  ...brand(signalIdentityBrand),
})

export const formatSignalIdentity = (identity: SignalIdentity): string =>
  ifElse(
    (candidate: SignalIdentity) => candidate.kind === 'Inventory',
    (candidate) =>
      [
        candidate.kind,
        formatGeographyScope(candidate.geography),
        formatMeasurementKind(candidate.measurementKind),
        formatPetroleumSlice(candidate.sourceKind),
        formatInventoryProduct(candidate.inventoryProduct),
      ].join('|'),
    (candidate) =>
      [
        candidate.kind,
        formatGeographyScope(candidate.geography),
        formatMeasurementKind(candidate.measurementKind),
        formatPetroleumSlice(candidate.sourceKind),
        formatPriceKind(candidate.priceKind),
      ].join('|'),
  )(identity)
