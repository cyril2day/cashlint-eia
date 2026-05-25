import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { ifElse } from '@/shared/fp'
import { none } from '@/shared/maybe'
import type { SparklinePointViewModel, SparklineViewModel } from '@/presentation/charts/contracts'
import {
  chartDisplayStateFromSignal,
  createSignalAccessibilitySummary,
  currentPointFromHistory,
  hasAnyHistory,
  HistoricalSignalPointInput,
  mapInterpretationCaveat,
  reportWeekIso,
  sortHistoricalPoints,
} from '@/presentation/charts/mappers/shared'

type SparklineMapperInput = Readonly<{
  readonly id: string
  readonly label: string
  readonly signal: ContextualizedSignal
  readonly historicalPoints: readonly HistoricalSignalPointInput[]
}>

const toSparklinePoint = (
  point: HistoricalSignalPointInput,
  currentReportWeekIso: string,
): SparklinePointViewModel => ({
  x: point.reportWeek.date.getTime(),
  y: point.value,
  reportWeekIso: reportWeekIso(point.reportWeek),
  isCurrent: reportWeekIso(point.reportWeek) === currentReportWeekIso,
})

const emptySparkline = (input: SparklineMapperInput): SparklineViewModel => ({
  id: input.id,
  label: input.label,
  points: [],
  currentPoint: none(),
  caveats: input.signal.caveats.map(mapInterpretationCaveat),
  accessibilitySummary: createSignalAccessibilitySummary(input.signal, 0),
  displayState: 'Empty',
})

const mapSparklineWithHistory = (
  sorted: readonly HistoricalSignalPointInput[],
  input: SparklineMapperInput,
  currentIso: string,
): SparklineViewModel => {
  const points = sorted.map(point => toSparklinePoint(point, currentIso))

  return {
    id: input.id,
    label: input.label,
    points,
    currentPoint: currentPointFromHistory(points),
    caveats: input.signal.caveats.map(mapInterpretationCaveat),
    accessibilitySummary: createSignalAccessibilitySummary(input.signal, points.length),
    displayState: chartDisplayStateFromSignal(input.signal),
  }
}

export const mapContextualizedSignalToSparkline = (input: SparklineMapperInput): SparklineViewModel => {
  const sorted = sortHistoricalPoints(input.historicalPoints)
  const currentIso = reportWeekIso(input.signal.signal.reportWeek)

  return ifElse(
    hasAnyHistory,
    () => mapSparklineWithHistory(sorted, input, currentIso),
    () => emptySparkline(input),
  )(sorted)
}
