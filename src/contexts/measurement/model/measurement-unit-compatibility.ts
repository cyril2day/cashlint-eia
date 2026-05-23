import type { MeasurementKind } from './measurement-kind'
import type { MeasurementUnit, MeasurementUnitCategory } from './measurement-unit'
import { measurementUnitCategory } from './measurement-unit'

const expectedUnitCategoryByKind: Record<MeasurementKind['kind'], MeasurementUnitCategory> = {
  CrudeStocks: 'stock',
  CushingStocks: 'stock',
  RefineryNetInput: 'flow',
  RefineryGrossInput: 'flow',
  RefineryOperableCapacity: 'flow',
  RefineryUtilization: 'percentage',
  DomesticProduction: 'flow',
  Imports: 'flow',
  Exports: 'flow',
  WTISpotPrice: 'price',
}

export const isMeasurementUnitCompatibleWithKind = (
  measurementKind: MeasurementKind,
  unit: MeasurementUnit,
): boolean => measurementUnitCategory(unit) === expectedUnitCategoryByKind[measurementKind.kind]
