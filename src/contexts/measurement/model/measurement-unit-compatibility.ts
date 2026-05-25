import type { MeasurementKind } from '@/contexts/measurement/model/measurement-kind'
import type { MeasurementUnit, MeasurementUnitCategory } from '@/contexts/measurement/model/measurement-unit'
import { measurementUnitCategory } from '@/contexts/measurement/model/measurement-unit'

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
