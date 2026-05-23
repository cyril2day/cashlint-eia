import { allPass, both, ifElse } from '@/shared/fp'
import { failure, success, type Result } from '@/shared/result'

export type ChartMargin = Readonly<{
  readonly top: number
  readonly right: number
  readonly bottom: number
  readonly left: number
}>

export type ChartDimensions = Readonly<{
  readonly outerWidth: number
  readonly outerHeight: number
  readonly margin: ChartMargin
  readonly innerWidth: number
  readonly innerHeight: number
}>

export type ChartDimensionError = Readonly<{
  readonly kind: 'InvalidChartDimensions'
  readonly reason: string
}>

export const defaultChartMargin: ChartMargin = {
  top: 16,
  right: 16,
  bottom: 24,
  left: 32,
}

const isFinitePositive = (value: number): boolean => both(Number.isFinite, (candidate: number) => candidate > 0)(value)
const isFiniteNonNegative = (value: number): boolean => both(Number.isFinite, (candidate: number) => candidate >= 0)(value)

const hasValidMargin = (margin: ChartMargin): boolean =>
  allPass([
    (candidate: ChartMargin) => isFiniteNonNegative(candidate.top),
    (candidate: ChartMargin) => isFiniteNonNegative(candidate.right),
    (candidate: ChartMargin) => isFiniteNonNegative(candidate.bottom),
    (candidate: ChartMargin) => isFiniteNonNegative(candidate.left),
  ])(margin)

const computeInnerWidth = (outerWidth: number, margin: ChartMargin): number => outerWidth - margin.left - margin.right
const computeInnerHeight = (outerHeight: number, margin: ChartMargin): number => outerHeight - margin.top - margin.bottom

const hasPositiveInnerSize = (outerWidth: number, outerHeight: number, margin: ChartMargin): boolean =>
  both(
    (candidate: ChartMargin) => computeInnerWidth(outerWidth, candidate) > 0,
    (candidate: ChartMargin) => computeInnerHeight(outerHeight, candidate) > 0,
  )(margin)

export const createChartDimensions = (
  outerWidth: number,
  outerHeight: number,
  margin: ChartMargin = defaultChartMargin,
): Result<ChartDimensions, ChartDimensionError> =>
  ifElse(
    (candidate: ChartMargin) =>
      allPass([
        () => isFinitePositive(outerWidth),
        () => isFinitePositive(outerHeight),
        hasValidMargin,
        () => hasPositiveInnerSize(outerWidth, outerHeight, candidate),
      ])(candidate),
    (candidate: ChartMargin) =>
      success({
        outerWidth,
        outerHeight,
        margin: candidate,
        innerWidth: computeInnerWidth(outerWidth, candidate),
        innerHeight: computeInnerHeight(outerHeight, candidate),
      }),
    () =>
      failure<ChartDimensionError>({
        kind: 'InvalidChartDimensions',
        reason: 'outer size or margins produced a non-positive plotting area',
      }),
  )(margin)
