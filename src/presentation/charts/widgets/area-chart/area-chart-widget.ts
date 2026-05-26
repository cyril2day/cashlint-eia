import { matchMaybe, type Maybe } from '@/shared/maybe'
import { both, cond, ifElse } from '@/shared/fp'
import { failure, success, type Result } from '@/shared/result'

export type AreaChartWidgetPoint = Readonly<{
  readonly x: number
  readonly y: number
  readonly xLabel: string
}>

export type AreaChartWidgetBaseline = Readonly<{
  readonly value: number
  readonly label: string
}>

export type AreaChartWidgetMarker = Readonly<{
  readonly x: number
  readonly y: number
  readonly label: string
}>

export type AreaChartWidgetInput = Readonly<{
  readonly points: readonly AreaChartWidgetPoint[]
  readonly baseline: Maybe<AreaChartWidgetBaseline>
  readonly currentMarker: Maybe<AreaChartWidgetMarker>
  readonly referenceMarkers: readonly AreaChartWidgetMarker[]
  readonly accessibilitySummary: string
}>

export type AreaChartWidgetError =
  | Readonly<{ readonly kind: 'InsufficientPoints' }>
  | Readonly<{ readonly kind: 'InvalidXValue' }>
  | Readonly<{ readonly kind: 'InvalidYValue' }>
  | Readonly<{ readonly kind: 'DuplicateXValue' }>
  | Readonly<{ readonly kind: 'InvalidBaseline' }>
  | Readonly<{ readonly kind: 'NegativeYValue' }>

export type AreaChartWidgetOutput = Readonly<{
  readonly points: readonly [AreaChartWidgetPoint, AreaChartWidgetPoint, ...AreaChartWidgetPoint[]]
  readonly baseline: number
}>

const hasEnoughPoints = (
  points: readonly AreaChartWidgetPoint[],
): points is readonly [AreaChartWidgetPoint, AreaChartWidgetPoint, ...AreaChartWidgetPoint[]] =>
  points.length >= 2

const pointsHaveFiniteX = (input: AreaChartWidgetInput): boolean =>
  input.points.every(point => Number.isFinite(point.x))

const pointsHaveFiniteY = (input: AreaChartWidgetInput): boolean =>
  input.points.every(point => Number.isFinite(point.y))

const pointHasNegativeY = (point: AreaChartWidgetPoint): boolean => point.y < 0

const pointsHaveNonNegativeY = (input: AreaChartWidgetInput): boolean =>
  input.points.some(pointHasNegativeY) === false

const uniqueXCount = (points: readonly AreaChartWidgetPoint[]): number =>
  new Set(points.map(point => point.x)).size

const pointsHaveUniqueX = (input: AreaChartWidgetInput): boolean =>
  uniqueXCount(input.points) === input.points.length

const baselineValue = (input: AreaChartWidgetInput): number =>
  matchMaybe<AreaChartWidgetBaseline, number>({
    Some: baseline => baseline.value,
    None: () => 0,
  })(input.baseline)

const baselineIsFinite = (input: AreaChartWidgetInput): boolean =>
  Number.isFinite(baselineValue(input))

const baselineIsZero = (input: AreaChartWidgetInput): boolean =>
  baselineValue(input) === 0

const baselineIsRenderable = both(baselineIsFinite, baselineIsZero)

const outputFromValidInput = (
  input: AreaChartWidgetInput,
): Result<AreaChartWidgetOutput, AreaChartWidgetError> =>
  ifElse(
    hasEnoughPoints,
    points => success({
      points,
      baseline: baselineValue(input),
    }),
    () => failure<AreaChartWidgetError>({ kind: 'InsufficientPoints' }),
  )(input.points)

export const computeAreaChartOutput = (
  input: AreaChartWidgetInput,
): Result<AreaChartWidgetOutput, AreaChartWidgetError> =>
  cond<[AreaChartWidgetInput], Result<AreaChartWidgetOutput, AreaChartWidgetError>>([
    [candidate => hasEnoughPoints(candidate.points) === false, () => failure({ kind: 'InsufficientPoints' })],
    [candidate => pointsHaveFiniteX(candidate) === false, () => failure({ kind: 'InvalidXValue' })],
    [candidate => pointsHaveFiniteY(candidate) === false, () => failure({ kind: 'InvalidYValue' })],
    [candidate => pointsHaveUniqueX(candidate) === false, () => failure({ kind: 'DuplicateXValue' })],
    [candidate => baselineIsRenderable(candidate) === false, () => failure({ kind: 'InvalidBaseline' })],
    [candidate => pointsHaveNonNegativeY(candidate) === false, () => failure({ kind: 'NegativeYValue' })],
    [() => true, outputFromValidInput],
  ])(input)
