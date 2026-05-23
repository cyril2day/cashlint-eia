import { includes, ifElse } from '@/shared/fp'
import { isStringInput } from '@/shared/domain'

import type { MeasurementKindLabel } from './measurement-kind'

export type RefineryMeasurementKindLabel = Extract<
  MeasurementKindLabel,
  'RefineryNetInput' | 'RefineryGrossInput' | 'RefineryOperableCapacity' | 'RefineryUtilization'
>

export type SupplyMeasurementKindLabel = Extract<MeasurementKindLabel, 'DomesticProduction' | 'Imports' | 'Exports'>

export const refineryMeasurementKindLabels: readonly RefineryMeasurementKindLabel[] = [
  'RefineryNetInput',
  'RefineryGrossInput',
  'RefineryOperableCapacity',
  'RefineryUtilization',
]

export const supplyMeasurementKindLabels: readonly SupplyMeasurementKindLabel[] = [
  'DomesticProduction',
  'Imports',
  'Exports',
]

export const isRefineryMeasurementKindLabel = (input: unknown): input is RefineryMeasurementKindLabel =>
  ifElse(
    isStringInput,
    (value: string) => includes(value, refineryMeasurementKindLabels),
    () => false,
  )(input)

export const isSupplyMeasurementKindLabel = (input: unknown): input is SupplyMeasurementKindLabel =>
  ifElse(
    isStringInput,
    (value: string) => includes(value, supplyMeasurementKindLabels),
    () => false,
  )(input)