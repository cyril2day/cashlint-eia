import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import type { BaselineResult } from '@/contexts/interpretation/model/baseline'
import type { InterpretationAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import { formatDecimal } from '@/shared/decimal'
import { ifElse } from '@/shared/fp'
import { none, type Maybe } from '@/shared/maybe'
import type { TimeSeriesAnomalyVisualModel, TimeSeriesBaselineVisualModel, TimeSeriesChartPointViewModel, TimeSeriesChartViewModel } from '@/presentation/charts/contracts'
import {
  chartDisplayStateFromSignal,
  createSignalAccessibilitySummary,
  currentPointFromHistory,
  hasAnyHistory,
  HistoricalSignalPointInput,
  mapInterpretationCaveat,
  reportWeekIso,
  sortHistoricalPoints,
  unitLabelFromSignal,
} from '@/presentation/charts/mappers/shared'

type TimeSeriesMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly signal: ContextualizedSignal
  readonly historicalPoints: readonly HistoricalSignalPointInput[]
}>

type ComputedBaseline = Extract<BaselineResult, { readonly kind: 'Computed' }>
type NotComputedBaseline = Extract<BaselineResult, { readonly kind: 'NotComputed' }>
type NormalAnomaly = Extract<InterpretationAnomalyState, { readonly kind: 'Normal' }>
type AnomalousAnomaly = Extract<InterpretationAnomalyState, { readonly kind: 'Anomalous' }>
type NotComputedAnomaly = Extract<InterpretationAnomalyState, { readonly kind: 'NotComputed' }>

const isComputedBaseline = (baseline: BaselineResult): baseline is ComputedBaseline =>
  baseline.kind === 'Computed'

const isNormalAnomaly = (anomaly: InterpretationAnomalyState): anomaly is NormalAnomaly =>
  anomaly.kind === 'Normal'

const isKnownAnomalousAnomaly = (
  anomaly: Exclude<InterpretationAnomalyState, NormalAnomaly>,
): anomaly is AnomalousAnomaly =>
  anomaly.kind === 'Anomalous'

const matchBaseline = <ResultValue>(
  cases: Readonly<{
    readonly Computed: (baseline: ComputedBaseline) => ResultValue
    readonly NotComputed: (baseline: NotComputedBaseline) => ResultValue
  }>,
) =>
  (baseline: BaselineResult): ResultValue => {
    const onComputed = (candidate: ComputedBaseline): ResultValue => cases.Computed(candidate)
    const onNotComputed = (candidate: NotComputedBaseline): ResultValue => cases.NotComputed(candidate)

    return ifElse(isComputedBaseline, onComputed, onNotComputed)(baseline)
  }

const matchKnownAnomaly = <ResultValue>(
  cases: Readonly<{
    readonly Anomalous: (anomaly: AnomalousAnomaly) => ResultValue
    readonly NotComputed: (anomaly: NotComputedAnomaly) => ResultValue
  }>,
) =>
  (anomaly: Exclude<InterpretationAnomalyState, NormalAnomaly>): ResultValue =>
    ifElse(
      isKnownAnomalousAnomaly,
      cases.Anomalous,
      cases.NotComputed,
    )(anomaly)

const matchAnomaly = <ResultValue>(
  cases: Readonly<{
    readonly Normal: (anomaly: NormalAnomaly) => ResultValue
    readonly Anomalous: (anomaly: AnomalousAnomaly) => ResultValue
    readonly NotComputed: (anomaly: NotComputedAnomaly) => ResultValue
  }>,
) =>
  (anomaly: InterpretationAnomalyState): ResultValue => {
    const onKnownAnomaly = matchKnownAnomaly({
      Anomalous: cases.Anomalous,
      NotComputed: cases.NotComputed,
    })

    return ifElse(isNormalAnomaly, cases.Normal, onKnownAnomaly)(anomaly)
  }

const toBaselineVisual = (signal: ContextualizedSignal): TimeSeriesBaselineVisualModel =>
  matchBaseline<TimeSeriesBaselineVisualModel>({
    Computed: candidate => ({
      kind: 'Computed',
      average: candidate.baseline.average,
      dispersion: candidate.baseline.dispersion,
      lowerBound: candidate.baseline.average - candidate.baseline.dispersion,
      upperBound: candidate.baseline.average + candidate.baseline.dispersion,
      label: `baseline ${formatDecimal(candidate.baseline.average)}`,
    }),
    NotComputed: candidate => ({ kind: 'NotComputed', reason: candidate.reason }),
  })(signal.baseline)

const toAnomalyVisual = (signal: ContextualizedSignal): TimeSeriesAnomalyVisualModel =>
  matchAnomaly<TimeSeriesAnomalyVisualModel>({
    Normal: candidate => ({ kind: 'Normal', score: candidate.score }),
    Anomalous: candidate => ({ kind: 'Anomalous', score: candidate.score, direction: candidate.direction }),
    NotComputed: candidate => ({ kind: 'NotComputed', reason: candidate.reason }),
  })(signal.anomaly)

const toPoint = (
  point: HistoricalSignalPointInput,
  currentReportWeekIso: string,
): TimeSeriesChartPointViewModel => ({
  x: point.reportWeek.date.getTime(),
  y: point.value,
  reportWeekIso: reportWeekIso(point.reportWeek),
  valueLabel: formatDecimal(point.value),
  isCurrent: reportWeekIso(point.reportWeek) === currentReportWeekIso,
})

const emptyViewModel = (input: TimeSeriesMapperInput): TimeSeriesChartViewModel => ({
  id: input.id,
  title: input.title,
  subtitle: input.subtitle,
  unitLabel: unitLabelFromSignal(input.signal),
  points: [],
  currentPoint: none(),
  baseline: toBaselineVisual(input.signal),
  anomaly: toAnomalyVisual(input.signal),
  caveats: input.signal.caveats.map(mapInterpretationCaveat),
  accessibilitySummary: createSignalAccessibilitySummary(input.signal, 0),
  displayState: 'Empty',
})

const mapTimeSeriesWithHistory = (
  sorted: readonly HistoricalSignalPointInput[],
  input: TimeSeriesMapperInput,
  currentIso: string,
): TimeSeriesChartViewModel => {
  const points = sorted.map(point => toPoint(point, currentIso))

  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    unitLabel: unitLabelFromSignal(input.signal),
    points,
    currentPoint: currentPointFromHistory(points),
    baseline: toBaselineVisual(input.signal),
    anomaly: toAnomalyVisual(input.signal),
    caveats: input.signal.caveats.map(mapInterpretationCaveat),
    accessibilitySummary: createSignalAccessibilitySummary(input.signal, points.length),
    displayState: chartDisplayStateFromSignal(input.signal),
  }
}

export const mapContextualizedSignalToTimeSeriesChart = (input: TimeSeriesMapperInput): TimeSeriesChartViewModel => {
  const sorted = sortHistoricalPoints(input.historicalPoints)
  const currentIso = reportWeekIso(input.signal.signal.reportWeek)

  return ifElse(
    hasAnyHistory,
    () => mapTimeSeriesWithHistory(sorted, input, currentIso),
    () => emptyViewModel(input),
  )(sorted)
}
