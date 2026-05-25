import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import type { InterpretationCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import type { BaselineResult } from '@/contexts/interpretation/model/baseline'
import type { InterpretationAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import type { Trend } from '@/contexts/interpretation/model/trend'
import { formatMeasurementUnit } from '@/contexts/measurement/model'
import { formatReportWeekIso, type ReportWeek } from '@/contexts/measurement/model/report-week'
import { either, ifElse, isNonEmptyString, sortBy } from '@/shared/fp'
import { formatDecimal, formatWholeDecimal } from '@/shared/decimal'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel, ChartDisplayState } from '../contracts'

export type HistoricalSignalPointInput = Readonly<{
  readonly reportWeek: ReportWeek
  readonly value: number
}>

export const sortHistoricalPoints = (points: readonly HistoricalSignalPointInput[]): readonly HistoricalSignalPointInput[] =>
  sortBy((point: HistoricalSignalPointInput) => point.reportWeek.date.getTime())(points)

type CaveatKind = InterpretationCaveat['kind']
type ComputedBaseline = Extract<BaselineResult, { readonly kind: 'Computed' }>
type NotComputedBaseline = Extract<BaselineResult, { readonly kind: 'NotComputed' }>
type NormalAnomaly = Extract<InterpretationAnomalyState, { readonly kind: 'Normal' }>
type AnomalousAnomaly = Extract<InterpretationAnomalyState, { readonly kind: 'Anomalous' }>
type NotComputedAnomaly = Extract<InterpretationAnomalyState, { readonly kind: 'NotComputed' }>
type ReasonedCaveat = Extract<InterpretationCaveat, { readonly kind: 'BaselineNotComputed' | 'AnomalyNotComputed' }>

const isComputedBaseline = (baseline: BaselineResult): baseline is ComputedBaseline =>
  baseline.kind === 'Computed'

const isNormalAnomaly = (anomaly: InterpretationAnomalyState): anomaly is NormalAnomaly =>
  anomaly.kind === 'Normal'

const isKnownAnomalousAnomaly = (
  anomaly: Exclude<InterpretationAnomalyState, NormalAnomaly>,
): anomaly is AnomalousAnomaly =>
  anomaly.kind === 'Anomalous'

const isReasonedCaveat = (caveat: InterpretationCaveat): caveat is ReasonedCaveat =>
  either(
    (candidate: InterpretationCaveat): boolean => candidate.kind === 'BaselineNotComputed',
    (candidate: InterpretationCaveat): boolean => candidate.kind === 'AnomalyNotComputed',
  )(caveat)

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

const caveatTitles: Readonly<Record<CaveatKind, string>> = {
  MissingPreviousObservation: 'Missing previous observation',
  IdentityMismatch: 'Identity mismatch',
  UnitMismatch: 'Unit mismatch',
  TrendNotComputed: 'Trend not computed',
  BaselineNotComputed: 'Baseline not computed',
  AnomalyNotComputed: 'Anomaly not computed',
  InsufficientBaselineHistory: 'Insufficient baseline history',
  DuplicateHistoryRejected: 'Duplicate history rejected',
  UnsupportedComparisonWindow: 'Unsupported comparison window',
  ComparisonWindowUnavailable: 'Comparison window unavailable',
}

const caveatTitle = (caveat: InterpretationCaveat): string =>
  caveatTitles[caveat.kind]

const caveatMessage = (caveat: InterpretationCaveat): string =>
  ifElse(
    isReasonedCaveat,
    candidate => candidate.reason,
    caveatTitle,
  )(caveat)

export const mapInterpretationCaveat = (caveat: InterpretationCaveat): ChartCaveatViewModel => ({
  kind: caveat.kind,
  title: caveatTitle(caveat),
  message: caveatMessage(caveat),
  severity: 'warning',
})

export const chartDisplayStateFromSignal = (signal: ContextualizedSignal): 'Complete' | 'Partial' =>
  ifElse(
    (candidate: ContextualizedSignal) => candidate.caveats.length > 0,
    (): 'Partial' => 'Partial',
    (): 'Complete' => 'Complete',
  )(signal)

export const chartDisplayStateFromHistory = (
  signal: ContextualizedSignal,
  pointCount: number,
): ChartDisplayState =>
  ifElse(
    (candidate: number) => candidate > 0,
    () => chartDisplayStateFromSignal(signal),
    (): ChartDisplayState => 'Empty',
  )(pointCount)

export const chartCaveatsFromSignal = (signal: ContextualizedSignal): readonly ChartCaveatViewModel[] =>
  signal.caveats.map(mapInterpretationCaveat)

const trendSentence = (signal: ContextualizedSignal): string =>
  matchMaybe<Trend, string>({
    Some: trend => `trend ${trend.direction.direction.toLowerCase()}`,
    None: () => 'trend not computed',
  })(signal.trend)

const anomalySentence = (signal: ContextualizedSignal): string =>
  matchAnomaly<string>({
    Normal: () => 'anomaly state normal',
    Anomalous: candidate => `anomalous ${candidate.direction.toLowerCase()}`,
    NotComputed: candidate => `anomaly not computed (${candidate.reason})`,
  })(signal.anomaly)

const baselineSentence = (signal: ContextualizedSignal): string =>
  matchBaseline<string>({
    Computed: candidate => `baseline computed from ${formatWholeDecimal(candidate.baseline.observationCount)} observations`,
    NotComputed: candidate => `baseline not computed (${candidate.reason})`,
  })(signal.baseline)

export const createSignalAccessibilitySummary = (
  signal: ContextualizedSignal,
  pointCount: number,
): string => {
  const signalKind = signal.signal.identity.kind.toLowerCase()
  const unitLabel = formatMeasurementUnit(signal.signal.unit)
  const caveatSentence = ifElse(
    (candidate: ContextualizedSignal) => candidate.caveats.length > 0,
    candidate => `with ${formatWholeDecimal(candidate.caveats.length)} caveat(s)`,
    () => 'with no caveats',
  )(signal)

  return [
    `${signalKind} signal history with ${formatWholeDecimal(pointCount)} point(s)`,
    `${formatDecimal(signal.signal.value)} ${unitLabel}`,
    trendSentence(signal),
    baselineSentence(signal),
    anomalySentence(signal),
    caveatSentence,
  ].join(', ')
}

export const unitLabelFromSignal = (signal: ContextualizedSignal): Maybe<string> =>
  ifElse(
    (candidate: ContextualizedSignal) => isNonEmptyString(formatMeasurementUnit(candidate.signal.unit)),
    candidate => some(formatMeasurementUnit(candidate.signal.unit)),
    () => none(),
  )(signal)

export const signalValueLabel = (signal: ContextualizedSignal): string =>
  formatDecimal(signal.signal.value)

export const signalCurrentMarkerLabel = (signal: ContextualizedSignal): string =>
  `Current ${signalValueLabel(signal)}`

export const baselineAverageMarker = <MarkerValue>(
  signal: ContextualizedSignal,
  createMarker: (average: number) => MarkerValue,
): Maybe<MarkerValue> =>
  matchBaseline<Maybe<MarkerValue>>({
    Computed: candidate => some(createMarker(candidate.baseline.average)),
    NotComputed: () => none(),
  })(signal.baseline)

export const trendLabelFromSignal = (signal: ContextualizedSignal): Maybe<string> =>
  matchMaybe<Trend, Maybe<string>>({
    Some: trend => some(`Trend ${trend.direction.direction.toLowerCase()}`),
    None: () => none(),
  })(signal.trend)

export const anomalyStatusLabelFromSignal = (signal: ContextualizedSignal): Maybe<string> =>
  matchAnomaly<Maybe<string>>({
    Normal: () => some('Anomaly normal'),
    Anomalous: anomaly => some(`Anomalous ${anomaly.direction.toLowerCase()}`),
    NotComputed: () => none(),
  })(signal.anomaly)

export const reportWeekIso = (reportWeek: ReportWeek): string => formatReportWeekIso(reportWeek)

export const currentPointFromHistory = <PointValue>(
  points: readonly PointValue[],
): Maybe<PointValue> =>
  ifElse(
    (candidate: readonly PointValue[]) => candidate.length > 0,
    candidate => some(candidate[candidate.length - 1]),
    () => none(),
  )(points)

export const hasAnyHistory = (points: readonly HistoricalSignalPointInput[]): boolean =>
  points.length > 0
