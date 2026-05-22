import { allPass, ifElse } from '@/shared/fp'
import { failure, success } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, isStringInput, hasBrand, brand } from '@/shared/domain'
import { getKey } from '@/shared/object'

const measurementKindBrand = Symbol('MeasurementKind')

export type MeasurementKindLabel =
  | 'CrudeStocks'
  | 'CushingStocks'
  | 'RefineryNetInput'
  | 'RefineryGrossInput'
  | 'RefineryOperableCapacity'
  | 'RefineryUtilization'
  | 'DomesticProduction'
  | 'Imports'
  | 'Exports'
  | 'WTISpotPrice'

const measurementKinds: readonly MeasurementKindLabel[] = [
  'CrudeStocks',
  'CushingStocks',
  'RefineryNetInput',
  'RefineryGrossInput',
  'RefineryOperableCapacity',
  'RefineryUtilization',
  'DomesticProduction',
  'Imports',
  'Exports',
  'WTISpotPrice',
]

export type MeasurementKind = Readonly<{
  readonly kind: MeasurementKindLabel
  readonly [measurementKindBrand]: true
}>

export type MeasurementKindParseError = Readonly<{
  readonly kind: 'InvalidMeasurementKindInput'
  readonly input: string
}>

const hasMeasurementKindBrand = hasBrand(measurementKindBrand)
const isMeasurementKindLabel = (input: unknown): input is MeasurementKindLabel =>
  ifElse(
    isStringInput,
    (s: string) => measurementKinds.some(k => k === s),
    () => false,
  )(input)

const hasValidKind = (candidate: object): boolean => isMeasurementKindLabel(getKey('kind')(candidate))

const createMeasurementKind = (kind: MeasurementKindLabel): MeasurementKind => ({
  kind,
  [measurementKindBrand]: true,
  ...brand(measurementKindBrand),
})

export const isMeasurementKind = (input: unknown): input is MeasurementKind =>
  ifElse(
    isObjectInput,
    allPass([hasMeasurementKindBrand, hasValidKind]),
    () => false,
  )(input)

const makeInvalidMeasurementKindError = (input: unknown): MeasurementKindParseError => ({
  kind: 'InvalidMeasurementKindInput',
  input: String(input),
})

const parseMeasurementKindFromString = (value: string): Result<MeasurementKind, MeasurementKindParseError> =>
  ifElse(
    isMeasurementKindLabel,
    (v: MeasurementKindLabel) => success(createMeasurementKind(v)),
    (v: unknown) => failure(makeInvalidMeasurementKindError(v)),
  )(value)

export const parseMeasurementKind = (
  input: unknown,
): Result<MeasurementKind, MeasurementKindParseError> =>
  ifElse(
    isMeasurementKind,
    (candidate: MeasurementKind) => success(candidate),
    (candidate: unknown) => parseMeasurementKindFromString(String(candidate)),
  )(input)

export const formatMeasurementKind = (kind: MeasurementKind): string => kind.kind
