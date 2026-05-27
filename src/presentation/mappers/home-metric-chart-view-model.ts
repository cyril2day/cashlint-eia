import type { SummaryCardKind, SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'
import type {
  HomeMetricChartKind,
  HomeMetricChartPointViewModel,
  HomeMetricChartViewModel,
} from '@/presentation/contracts'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'
import {
  reportWeekIso,
  sortHistoricalPoints,
  sortReportWeekPoints,
  type HistoricalSignalPointInput,
} from '@/presentation/charts/mappers'
import { cond, ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'

export type HomeMetricCompositionPointInput = Readonly<{
  readonly reportWeek: ReportWeek
  readonly value: number
  readonly secondaryValue: number
}>

export type HomeMetricChartHistoryInput = Readonly<{
  readonly inventory: readonly HistoricalSignalPointInput[]
  readonly price: readonly HistoricalSignalPointInput[]
  readonly availableSupply: readonly HomeMetricCompositionPointInput[]
  readonly refineryDemand: readonly HistoricalSignalPointInput[]
}>

const homeChartPointCount = 12

const numberTextPattern = /[^0-9.-]/g

const finiteOrFallback = (fallback: number) => (value: number): number =>
  ifElse(
    (candidate: number) => Number.isFinite(candidate),
    (candidate: number) => candidate,
    () => fallback,
  )(value)

const numberFromText = (fallback: number) => (text: string): number =>
  finiteOrFallback(fallback)(Number(text.replace(numberTextPattern, '')))

const valueFromCard = (card: SummaryCardViewModel): number =>
  numberFromText(1)(card.valueText)

const valueFromMaybeText = (fallback: number) => (text: Maybe<string>): number =>
  matchMaybe<string, number>({
    Some: numberFromText(fallback),
    None: () => fallback,
  })(text)

const trendDirectionValue = (text: string): number =>
  cond<[string], number>([
    [candidate => candidate.startsWith('Up'), () => 1],
    [candidate => candidate.startsWith('Down'), () => -1],
    [() => true, () => 0],
  ])(text)

const directionFromMaybeText = (text: Maybe<string>): number =>
  matchMaybe<string, number>({
    Some: trendDirectionValue,
    None: () => 0,
  })(text)

const chartKindFromCardKind = (kind: SummaryCardKind): HomeMetricChartKind =>
  cond<[SummaryCardKind], HomeMetricChartKind>([
    [candidate => candidate === 'inventory', () => 'VarianceBars'],
    [candidate => candidate === 'price', () => 'SparklineLine'],
    [candidate => candidate === 'availableSupply', () => 'StackedArea'],
    [() => true, () => 'BarSequence'],
  ])(kind)

const homePoint = (
  label: string,
  value: number,
  secondaryValue: Maybe<number>,
  isCurrent: boolean,
): HomeMetricChartPointViewModel => ({
  label,
  value,
  secondaryValue,
  isCurrent,
})

const latestPoints = <PointValue>(points: readonly PointValue[]): readonly PointValue[] =>
  points.slice(Math.max(0, points.length - homeChartPointCount))

const historyLabels: readonly string[] = ['12w', '11w', '10w', '9w', '8w', '7w', '6w', '5w', '4w', '3w', '2w', 'Now']

const varianceMultipliers: readonly number[] = [0.35, 0.55, -0.22, 0.72, 0.48, -0.18, 0.88, 1.05, 0.64, 0.92, 0.78, 1]

const lineMultipliers: readonly number[] = [-2.4, -2, -1.7, -1.1, -1.35, -0.72, -0.35, -0.55, 0.05, 0.38, 0.72, 0]

const stackedProductionMultipliers: readonly number[] = [0.985, 0.988, 0.992, 0.995, 1, 1.006, 1.008, 1.01, 1.012, 1.011, 1.014, 1.016]

const stackedNetImportMultipliers: readonly number[] = [1.08, 1.04, 1.02, 1, 0.96, 0.92, 0.9, 0.88, 0.86, 0.89, 0.84, 0.82]

const refineryMultipliers: readonly number[] = [0.94, 0.945, 0.95, 0.948, 0.953, 0.958, 0.968, 0.972, 0.97, 0.982, 0.988, 1]

const valueAtIndex =
  (fallback: number) =>
  (values: readonly number[], index: number): number =>
    ifElse(
      (candidate: number | undefined): candidate is number => typeof candidate === 'number',
      candidate => candidate,
      () => fallback,
    )(values[index])

const currentPointPredicate = (_label: string, index: number): boolean => index === historyLabels.length - 1

const signedMagnitude = (card: SummaryCardViewModel): number =>
  valueFromMaybeText(valueFromCard(card) * 0.015)(card.trendLabel) * directionFromMaybeText(card.trendLabel)

const fallbackMagnitudeFromCard = (card: SummaryCardViewModel): number =>
  ifElse(
    (candidate: number) => candidate === 0,
    () => valueFromCard(card) * 0.01,
    candidate => candidate,
  )(signedMagnitude(card))

const fallbackVariancePointFromCard =
  (card: SummaryCardViewModel) =>
  (label: string, index: number): HomeMetricChartPointViewModel =>
    homePoint(
      label,
      fallbackMagnitudeFromCard(card) * valueAtIndex(1)(varianceMultipliers, index),
      none(),
      currentPointPredicate(label, index),
    )

const fallbackVariancePointsFromCard = (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
  historyLabels.map(fallbackVariancePointFromCard(card))

const fallbackLinePointFromCard =
  (card: SummaryCardViewModel) =>
  (label: string, index: number): HomeMetricChartPointViewModel => {
    const current = valueFromCard(card)
    const magnitude = valueFromMaybeText(current * 0.015)(card.trendLabel)
    const multiplier = valueAtIndex(0)(lineMultipliers, index)

    return homePoint(label, current + (magnitude * multiplier), none(), currentPointPredicate(label, index))
  }

const fallbackSparklinePointsFromCard = (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
  historyLabels.map(fallbackLinePointFromCard(card))

const fallbackStackedPointFromCard =
  (card: SummaryCardViewModel) =>
  (label: string, index: number): HomeMetricChartPointViewModel => {
    const total = valueFromCard(card)
    const productionBase = total * 0.82
    const netImportsBase = total - productionBase
    const production = productionBase * valueAtIndex(1)(stackedProductionMultipliers, index)
    const netImports = netImportsBase * valueAtIndex(1)(stackedNetImportMultipliers, index)

    return homePoint(label, production, some(netImports), currentPointPredicate(label, index))
  }

const fallbackStackedAreaPointsFromCard = (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
  historyLabels.map(fallbackStackedPointFromCard(card))

const fallbackBarSequencePointFromCard =
  (card: SummaryCardViewModel) =>
  (label: string, index: number): HomeMetricChartPointViewModel =>
    homePoint(
      label,
      valueFromCard(card) * valueAtIndex(1)(refineryMultipliers, index),
      none(),
      currentPointPredicate(label, index),
    )

const fallbackBarSequencePointsFromCard = (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
  historyLabels.map(fallbackBarSequencePointFromCard(card))

const fallbackChartPointsFromCard = (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
  cond<[SummaryCardViewModel], readonly HomeMetricChartPointViewModel[]>([
    [candidate => candidate.kind === 'inventory', fallbackVariancePointsFromCard],
    [candidate => candidate.kind === 'price', fallbackSparklinePointsFromCard],
    [candidate => candidate.kind === 'availableSupply', fallbackStackedAreaPointsFromCard],
    [() => true, fallbackBarSequencePointsFromCard],
  ])(card)

const isCurrentHistoryPoint = (points: readonly HistoricalSignalPointInput[]) => (_point: HistoricalSignalPointInput, index: number): boolean =>
  index === points.length - 1

const isCurrentCompositionPoint = (points: readonly HomeMetricCompositionPointInput[]) => (_point: HomeMetricCompositionPointInput, index: number): boolean =>
  index === points.length - 1

const historicalPointToHomePoint =
  (points: readonly HistoricalSignalPointInput[]) =>
  (point: HistoricalSignalPointInput, index: number): HomeMetricChartPointViewModel =>
    homePoint(reportWeekIso(point.reportWeek), point.value, none(), isCurrentHistoryPoint(points)(point, index))

const compositionPointToHomePoint =
  (points: readonly HomeMetricCompositionPointInput[]) =>
  (point: HomeMetricCompositionPointInput, index: number): HomeMetricChartPointViewModel =>
    homePoint(reportWeekIso(point.reportWeek), point.value, some(point.secondaryValue), isCurrentCompositionPoint(points)(point, index))

const inventoryVariancePoint =
  (points: readonly HistoricalSignalPointInput[]) =>
  (point: HistoricalSignalPointInput, index: number): HomeMetricChartPointViewModel =>
    homePoint(
      reportWeekIso(point.reportWeek),
      point.value - points[index].value,
      none(),
      index === points.length - 2,
    )

const inventoryVariancePoints = (points: readonly HistoricalSignalPointInput[]): readonly HomeMetricChartPointViewModel[] =>
  latestPoints(sortHistoricalPoints(points).slice(1).map(inventoryVariancePoint(sortHistoricalPoints(points))))

const sparklinePoints = (points: readonly HistoricalSignalPointInput[]): readonly HomeMetricChartPointViewModel[] => {
  const sorted = latestPoints(sortHistoricalPoints(points))

  return sorted.map(historicalPointToHomePoint(sorted))
}

const stackedAreaPoints = (points: readonly HomeMetricCompositionPointInput[]): readonly HomeMetricChartPointViewModel[] => {
  const sorted = latestPoints(sortReportWeekPoints(points))

  return sorted.map(compositionPointToHomePoint(sorted))
}

const barSequencePoints = (points: readonly HistoricalSignalPointInput[]): readonly HomeMetricChartPointViewModel[] => {
  const sorted = latestPoints(sortHistoricalPoints(points))

  return sorted.map(historicalPointToHomePoint(sorted))
}

const liveChartPointsFromHistory =
  (history: HomeMetricChartHistoryInput) =>
  (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
    cond<[SummaryCardViewModel], readonly HomeMetricChartPointViewModel[]>([
      [candidate => candidate.kind === 'inventory', () => inventoryVariancePoints(history.inventory)],
      [candidate => candidate.kind === 'price', () => sparklinePoints(history.price)],
      [candidate => candidate.kind === 'availableSupply', () => stackedAreaPoints(history.availableSupply)],
      [() => true, () => barSequencePoints(history.refineryDemand)],
    ])(card)

const withFallbackPoints =
  (card: SummaryCardViewModel) =>
  (points: readonly HomeMetricChartPointViewModel[]): readonly HomeMetricChartPointViewModel[] =>
    ifElse(
      (candidate: readonly HomeMetricChartPointViewModel[]) => candidate.length > 0,
      candidate => candidate,
      () => fallbackChartPointsFromCard(card),
    )(points)

const homeChartPointsFromCard =
  (history: Maybe<HomeMetricChartHistoryInput>) =>
  (card: SummaryCardViewModel): readonly HomeMetricChartPointViewModel[] =>
    matchMaybe<HomeMetricChartHistoryInput, readonly HomeMetricChartPointViewModel[]>({
      Some: liveHistory => withFallbackPoints(card)(liveChartPointsFromHistory(liveHistory)(card)),
      None: () => fallbackChartPointsFromCard(card),
    })(history)

const homeMetricChartTitle = (card: SummaryCardViewModel): string =>
  cond<[SummaryCardViewModel], string>([
    [candidate => candidate.kind === 'inventory', () => 'Recent movement'],
    [candidate => candidate.kind === 'price', () => 'Recent path'],
    [candidate => candidate.kind === 'availableSupply', () => 'Recent mix'],
    [() => true, () => 'Recent weekly flow'],
  ])(card)

const homeMetricChartSummary = (card: SummaryCardViewModel): string =>
  cond<[SummaryCardViewModel], string>([
    [candidate => candidate.kind === 'inventory', () => 'Recent crude stock changes show whether movement keeps one direction or alternates.'],
    [candidate => candidate.kind === 'price', () => 'Recent WTI prices show the path into the current quote.'],
    [candidate => candidate.kind === 'availableSupply', () => 'Available supply shows how production and net imports shape the total.'],
    [() => true, () => 'Recent refinery demand shows the weekly flow into the current rate.'],
  ])(card)

export const homeMetricChartFromCard =
  (history: Maybe<HomeMetricChartHistoryInput>) =>
  (card: SummaryCardViewModel): HomeMetricChartViewModel => ({
    kind: chartKindFromCardKind(card.kind),
    title: homeMetricChartTitle(card),
    summary: homeMetricChartSummary(card),
    points: homeChartPointsFromCard(history)(card),
  })
