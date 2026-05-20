import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand } from '@/shared/domain'

const measurementUnitBrand = Symbol('MeasurementUnit')

export type MeasurementUnitLabel =
  | 'ThousandBarrels'
  | 'MillionBarrels'
  | 'ThousandBarrelsPerDay'
  | 'Percent'
  | 'USDPerBarrel'

const measurementUnits: readonly MeasurementUnitLabel[] = [
  'ThousandBarrels',
  'MillionBarrels',
  'ThousandBarrelsPerDay',
  'Percent',
  'USDPerBarrel',
]

export type MeasurementUnit = Readonly<{
  readonly unit: MeasurementUnitLabel
  readonly [measurementUnitBrand]: true
}>

export type MeasurementUnitParseError = Readonly<{
  readonly kind: 'InvalidMeasurementUnitInput'
  readonly input: string
}>

const hasMeasurementUnitBrand = hasBrand(measurementUnitBrand)
const isMeasurementUnitLabel = (input: unknown): input is MeasurementUnitLabel =>
  ifElse(
    isStringInput,
    (s: string) => measurementUnits.some(u => u === s),
    () => false,
  )(input)

const hasValidUnit = (candidate: object): boolean => isMeasurementUnitLabel(Reflect.get(candidate, 'unit'))

const createMeasurementUnit = (unit: MeasurementUnitLabel): MeasurementUnit => ({
  unit,
  [measurementUnitBrand]: true,
})

export const isMeasurementUnit = (input: unknown): input is MeasurementUnit =>
  ifElse(
    isObjectInput,
    allPass([hasMeasurementUnitBrand, hasValidUnit]),
    () => false,
  )(input)

const parseMeasurementUnitFromString = (value: string): Result<MeasurementUnit, MeasurementUnitParseError> =>
  ifElse(
    isMeasurementUnitLabel,
    (v: MeasurementUnitLabel) => success(createMeasurementUnit(v)),
    (v: unknown) => failure(makeInvalidMeasurementUnitError(v)),
  )(value)

export const parseMeasurementUnit = (
  input: unknown,
): Result<MeasurementUnit, MeasurementUnitParseError> =>
  ifElse(
    isMeasurementUnit,
    (candidate: MeasurementUnit) => success(candidate),
    (candidate: unknown) => parseMeasurementUnitFromString(String(candidate)),
  )(input)

export type MeasurementUnitCategory = 'stock' | 'flow' | 'percentage' | 'price'

const makeInvalidMeasurementUnitError = (input: unknown): MeasurementUnitParseError => ({
  kind: 'InvalidMeasurementUnitInput',
  input: String(input),
})

const measurementUnitCategoryMap: Record<MeasurementUnitLabel, MeasurementUnitCategory> = {
  ThousandBarrels: 'stock',
  MillionBarrels: 'stock',
  ThousandBarrelsPerDay: 'flow',
  Percent: 'percentage',
  USDPerBarrel: 'price',
}

export const measurementUnitCategory = (unit: MeasurementUnit): MeasurementUnitCategory =>
  measurementUnitCategoryMap[unit.unit]

export const formatMeasurementUnit = (unit: MeasurementUnit): string => unit.unit
