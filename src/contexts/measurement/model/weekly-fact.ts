import { success, failure } from '@/shared/result'
import type { Result } from '@/shared/result'
import { isObjectInput, hasBrand } from '@/shared/domain'
import type { ReportWeek } from './report-week'
import type { GeographyScope } from './geography-scope'
import type { PetroleumSlice } from './petroleum-slice'
import type { MeasurementKind } from './measurement-kind'
import type { Decimal } from '@/shared/decimal'
import type { MeasurementUnit } from './measurement-unit'
import type { SourceIdentity } from './source-identity'
import { allPass, ifElse } from '@/shared/fp'
import { type Maybe } from '@/shared/maybe'

const weeklyFactBrand = Symbol('WeeklyFact')

export type WeeklyFact = Readonly<{
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly slice: PetroleumSlice
  readonly measurementKind: MeasurementKind
  readonly value: Decimal
  readonly unit: MeasurementUnit
  readonly source: Maybe<SourceIdentity>
  readonly [weeklyFactBrand]: true
}>

export type WeeklyFactParseError = Readonly<{
  readonly kind: 'InvalidWeeklyFactInput'
  readonly input: string
}>

const hasWeeklyFactBrand = hasBrand(weeklyFactBrand)

// Intentionally minimal constructor omitted; parsing accepts only already-shaped WeeklyFact

const makeInvalidWeeklyFactError = (input: unknown): WeeklyFactParseError => ({
  kind: 'InvalidWeeklyFactInput',
  input: String(input),
})

const hasWeeklyFrequencyFields = (candidate: object): boolean =>
  allPass([
    (c: object) => Boolean(Reflect.get(c, 'reportWeek')),
    (c: object) => Boolean(Reflect.get(c, 'geography')),
    (c: object) => Boolean(Reflect.get(c, 'slice')),
    (c: object) => Boolean(Reflect.get(c, 'measurementKind')),
    (c: object) => Boolean(Reflect.get(c, 'value')),
    (c: object) => Boolean(Reflect.get(c, 'unit')),
  ])(candidate)

export const isWeeklyFact = (input: unknown): input is WeeklyFact =>
  ifElse(isObjectInput, allPass([hasWeeklyFactBrand, hasWeeklyFrequencyFields]), () => false)(input)

export const parseWeeklyFact = (input: unknown): Result<WeeklyFact, WeeklyFactParseError> =>
  ifElse(
    isWeeklyFact,
    (candidate: WeeklyFact): Result<WeeklyFact, WeeklyFactParseError> => success(candidate),
    () => failure(makeInvalidWeeklyFactError(input)),
  )(input)

export const formatWeeklyFact = (f: WeeklyFact): string => `week ${String(f.value)} ${f.unit.unit}`

export default parseWeeklyFact
