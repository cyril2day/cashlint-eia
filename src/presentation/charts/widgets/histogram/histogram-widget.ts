import { both, cond, ifElse } from '@/shared/fp'
import { firstArrayItem, lastArrayItem } from '@/shared/collection'
import { failure, isSuccess, success, type Result } from '@/shared/result'

export type HistogramWidgetBinStrategy =
  | Readonly<{ readonly kind: 'Automatic'; readonly requestedBinCount: number }>
  | Readonly<{ readonly kind: 'ManualThresholds'; readonly thresholds: readonly number[] }>

export type HistogramWidgetMarker = Readonly<{
  readonly value: number
  readonly label: string
}>

export type HistogramWidgetInput = Readonly<{
  readonly values: readonly number[]
  readonly binStrategy: HistogramWidgetBinStrategy
  readonly markers: readonly HistogramWidgetMarker[]
  readonly accessibilitySummary: string
}>

export type HistogramWidgetBin = Readonly<{
  readonly index: number
  readonly minimum: number
  readonly maximum: number
  readonly count: number
  readonly boundary: 'HalfOpen' | 'Closed'
}>

export type HistogramWidgetError =
  | Readonly<{ readonly kind: 'EmptyDataset' }>
  | Readonly<{ readonly kind: 'NonNumericValue' }>
  | Readonly<{ readonly kind: 'InvalidBinCount' }>
  | Readonly<{ readonly kind: 'InvalidBinBoundaries' }>
  | Readonly<{ readonly kind: 'BoundariesOutsideDatasetRange' }>

type AutomaticHistogramWidgetBinStrategy = Extract<HistogramWidgetBinStrategy, { readonly kind: 'Automatic' }>
type ManualHistogramWidgetBinStrategy = Extract<HistogramWidgetBinStrategy, { readonly kind: 'ManualThresholds' }>
type ValidManualThresholds = readonly [number, number, ...number[]]

const closedBoundary = (): 'Closed' => 'Closed'
const halfOpenBoundary = (): 'HalfOpen' => 'HalfOpen'

const isAutomaticBinStrategy = (
  strategy: HistogramWidgetBinStrategy,
): strategy is AutomaticHistogramWidgetBinStrategy =>
  strategy.kind === 'Automatic'

const isManualBinStrategy = (
  strategy: HistogramWidgetBinStrategy,
): strategy is ManualHistogramWidgetBinStrategy =>
  strategy.kind === 'ManualThresholds'

const hasValues = (input: HistogramWidgetInput): boolean => input.values.length > 0

const valuesAreFinite = (input: HistogramWidgetInput): boolean =>
  input.values.every(Number.isFinite)

const isPositiveInteger = both(Number.isInteger, (value: number): boolean => value > 0)

const hasValidAutomaticBinCount = (strategy: AutomaticHistogramWidgetBinStrategy): boolean =>
  isPositiveInteger(strategy.requestedBinCount)

const hasAtLeastTwoThresholds = (
  thresholds: readonly number[],
): thresholds is ValidManualThresholds =>
  thresholds.length >= 2

const thresholdsAreFinite = (thresholds: readonly number[]): boolean =>
  thresholds.every(Number.isFinite)

const thresholdPairIsAscending =
  (thresholds: readonly number[]) =>
  (threshold: number, index: number): boolean =>
    ifElse(
      (candidate: number): boolean => candidate === 0,
      () => true,
      candidate => threshold > thresholds[candidate - 1],
    )(index)

const thresholdsAreAscending = (thresholds: readonly number[]): boolean =>
  thresholds.every(thresholdPairIsAscending(thresholds))

const datasetMinimum = (values: readonly number[]): number =>
  Math.min(...values)

const datasetMaximum = (values: readonly number[]): number =>
  Math.max(...values)

const thresholdsCoverValues =
  (values: readonly number[]) =>
  (thresholds: ValidManualThresholds): boolean =>
    both(
      (candidate: ValidManualThresholds) => firstArrayItem(candidate) <= datasetMinimum(values),
      (candidate: ValidManualThresholds) => lastArrayItem(candidate) >= datasetMaximum(values),
    )(thresholds)

const validManualThresholds = (
  input: HistogramWidgetInput,
  strategy: ManualHistogramWidgetBinStrategy,
): Result<ValidManualThresholds, HistogramWidgetError> =>
  cond<[ManualHistogramWidgetBinStrategy], Result<ValidManualThresholds, HistogramWidgetError>>([
    [
      candidate => thresholdsAreFinite(candidate.thresholds) === false,
      () => failure({ kind: 'InvalidBinBoundaries' }),
    ],
    [
      candidate => hasAtLeastTwoThresholds(candidate.thresholds) === false,
      () => failure({ kind: 'InvalidBinBoundaries' }),
    ],
    [
      candidate => thresholdsAreAscending(candidate.thresholds) === false,
      () => failure({ kind: 'InvalidBinBoundaries' }),
    ],
    [
      candidate =>
        ifElse(
          hasAtLeastTwoThresholds,
          thresholds => thresholdsCoverValues(input.values)(thresholds) === false,
          () => true,
        )(candidate.thresholds),
      () => failure({ kind: 'BoundariesOutsideDatasetRange' }),
    ],
    [
      () => true,
      candidate =>
        ifElse(
          hasAtLeastTwoThresholds,
          thresholds => success<ValidManualThresholds>(thresholds),
          () => failure<HistogramWidgetError>({ kind: 'InvalidBinBoundaries' }),
        )(candidate.thresholds),
    ],
  ])(strategy)

const automaticBinIndexForValue =
  (minimum: number, maximum: number, binCount: number) =>
  (value: number): number => {
    const ratio = (value - minimum) / (maximum - minimum)
    const rawIndex = Math.floor(ratio * binCount)

    return Math.min(binCount - 1, Math.max(0, rawIndex))
  }

const automaticBinCountAtIndex =
  (values: readonly number[], minimum: number, maximum: number, binCount: number) =>
  (index: number): number =>
    values.filter(value => automaticBinIndexForValue(minimum, maximum, binCount)(value) === index).length

const automaticBin =
  (values: readonly number[], minimum: number, maximum: number, binCount: number) =>
  (_: unknown, index: number): HistogramWidgetBin => {
    const interval = (maximum - minimum) / binCount
    const binMinimum = minimum + (interval * index)

    return {
      index,
      minimum: binMinimum,
      maximum: binMinimum + interval,
      count: automaticBinCountAtIndex(values, minimum, maximum, binCount)(index),
      boundary: ifElse((candidate: number) => candidate === binCount - 1, closedBoundary, halfOpenBoundary)(index),
    }
  }

const automaticBins = (
  values: readonly number[],
  strategy: AutomaticHistogramWidgetBinStrategy,
): readonly HistogramWidgetBin[] =>
  Array.from(
    { length: strategy.requestedBinCount },
    automaticBin(values, datasetMinimum(values), datasetMaximum(values), strategy.requestedBinCount),
  )

const isFinalManualBin =
  (thresholds: ValidManualThresholds) =>
  (index: number): boolean =>
    index === thresholds.length - 2

const valueWithinHalfOpenBin =
  (minimum: number, maximum: number) =>
  (value: number): boolean =>
    both(
      (candidate: number) => candidate >= minimum,
      (candidate: number) => candidate < maximum,
    )(value)

const valueWithinClosedBin =
  (minimum: number, maximum: number) =>
  (value: number): boolean =>
    both(
      (candidate: number) => candidate >= minimum,
      (candidate: number) => candidate <= maximum,
    )(value)

const valueWithinManualBin =
  (thresholds: ValidManualThresholds, minimum: number, maximum: number, index: number) =>
  (value: number): boolean =>
    ifElse(
      isFinalManualBin(thresholds),
      () => valueWithinClosedBin(minimum, maximum)(value),
      () => valueWithinHalfOpenBin(minimum, maximum)(value),
    )(index)

const manualBin =
  (values: readonly number[], thresholds: ValidManualThresholds) =>
  (minimum: number, index: number): HistogramWidgetBin => {
    const maximum = thresholds[index + 1]

    return {
      index,
      minimum,
      maximum,
      count: values.filter(value => valueWithinManualBin(thresholds, minimum, maximum, index)(value)).length,
      boundary: ifElse(isFinalManualBin(thresholds), closedBoundary, halfOpenBoundary)(index),
    }
  }

const manualBins = (
  values: readonly number[],
  thresholds: ValidManualThresholds,
): readonly HistogramWidgetBin[] =>
  thresholds.slice(0, -1).map(manualBin(values, thresholds))

const automaticBinsResult =
  (input: HistogramWidgetInput) =>
  (strategy: AutomaticHistogramWidgetBinStrategy): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
    ifElse(
      hasValidAutomaticBinCount,
      candidate => success<readonly HistogramWidgetBin[]>(automaticBins(input.values, candidate)),
      () => failure<HistogramWidgetError>({ kind: 'InvalidBinCount' }),
    )(strategy)

const manualBinsFromThresholdResult =
  (input: HistogramWidgetInput) =>
  (
    result: Result<ValidManualThresholds, HistogramWidgetError>,
  ): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
    ifElse(
      isSuccess<ValidManualThresholds, HistogramWidgetError>,
      candidate => success<readonly HistogramWidgetBin[]>(manualBins(input.values, candidate.value)),
      candidate => failure<HistogramWidgetError>(candidate.error),
    )(result)

const manualBinsResult =
  (input: HistogramWidgetInput) =>
  (strategy: ManualHistogramWidgetBinStrategy): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
    manualBinsFromThresholdResult(input)(validManualThresholds(input, strategy))

const invalidBinBoundaries = (): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
  failure({ kind: 'InvalidBinBoundaries' })

const manualOrInvalidBinsResult =
  (input: HistogramWidgetInput) =>
  (strategy: HistogramWidgetBinStrategy): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
    ifElse(
      isManualBinStrategy,
      manualBinsResult(input),
      invalidBinBoundaries,
    )(strategy)

const binsForValidInput = (
  input: HistogramWidgetInput,
): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
  ifElse(
    isAutomaticBinStrategy,
    automaticBinsResult(input),
    manualOrInvalidBinsResult(input),
  )(input.binStrategy)

export const computeHistogramBins = (
  input: HistogramWidgetInput,
): Result<readonly HistogramWidgetBin[], HistogramWidgetError> =>
  cond<[HistogramWidgetInput], Result<readonly HistogramWidgetBin[], HistogramWidgetError>>([
    [candidate => hasValues(candidate) === false, () => failure({ kind: 'EmptyDataset' })],
    [candidate => valuesAreFinite(candidate) === false, () => failure({ kind: 'NonNumericValue' })],
    [() => true, binsForValidInput],
  ])(input)
