import type { WeeklyAnalysis } from '@/contexts/analysis/model/weekly-analysis'
import type { AnalysisCaveat } from '@/contexts/analysis/model/analysis-caveat'
import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import type { SystemBalanceAnalysis } from '@/contexts/system-balance/model'
import { formatSummaryConditionLabel, formatSummaryConfidenceLabel, formatSummaryTrendLabel, formatSummaryAnomalyLabel } from '@/presentation/display-policies'
import {
  formatSummaryGeographyText,
  formatSummaryReportWeekText,
  formatSummarySignalSubtitleText,
  formatSummarySignalValueText,
} from '@/presentation/formatting-policies'
import { isStringInput } from '@/shared/domain'
import { both, cond, ifElse } from '@/shared/fp'
import { getKey } from '@/shared/object'
import { none, some, type Maybe } from '@/shared/maybe'

import type { PresentationCaveatKind, PresentationCaveatViewModel } from '@/presentation/contracts/presentation-caveat-view-model'
import type { SummaryCardKind, SummaryCardViewModel } from '@/presentation/contracts/summary-card-view-model'
import type { SummaryDisplayState, SummaryViewModel } from '@/presentation/contracts/summary-view-model'

const createCaveat = (
  kind: PresentationCaveatKind,
  title: string,
  message: string,
  severity: PresentationCaveatViewModel['severity'] = 'warning',
): PresentationCaveatViewModel => ({
  kind,
  title,
  message,
  severity,
})

type InterpretationCaveat = ContextualizedSignal['caveats'][number]
type WeeklyAnalysisWithTrace = WeeklyAnalysis & Readonly<{
  readonly trace: Extract<WeeklyAnalysis['trace'], { readonly kind: 'Some' }>
}>

const hasReason = (candidate: object): candidate is Readonly<{ readonly reason: string }> =>
  both(
    (value: object) => 'reason' in value,
    (value: object) => isStringInput(getKey('reason')(value)),
  )(candidate)

const hasSource = (candidate: object): candidate is Readonly<{ readonly source: InterpretationCaveat }> =>
  'source' in candidate

const isPropagatedSystemBalanceCaveat = (
  caveat: AnalysisCaveat,
): caveat is Extract<AnalysisCaveat, { readonly kind: 'PropagatedSystemBalanceCaveat' }> =>
  caveat.kind === 'PropagatedSystemBalanceCaveat'

const hasAnalysisTrace = (analysis: WeeklyAnalysis): analysis is WeeklyAnalysisWithTrace =>
  analysis.trace.kind === 'Some'

const getCaveatReasonOrDefault = (fallback: string) => (candidate: object): string =>
  ifElse(
    hasReason,
    value => value.reason,
    () => fallback,
  )(candidate)

const formatSourceCaveatOrDefault = (fallback: PresentationCaveatViewModel) =>
  (candidate: object): PresentationCaveatViewModel =>
    ifElse(
      hasSource,
      value => formatInterpretationCaveatMessage(value.source),
      () => fallback,
    )(candidate)

const formatInterpretationCaveatMessage = (caveat: InterpretationCaveat): PresentationCaveatViewModel =>
  cond<[InterpretationCaveat], PresentationCaveatViewModel>([
    [candidate => candidate.kind === 'MissingPreviousObservation', () =>
      createCaveat('missing-previous-observation', 'Missing previous observation', 'No previous observation is available.')],
    [candidate => candidate.kind === 'IdentityMismatch', () =>
      createCaveat('identity-mismatch', 'Identity mismatch', 'Signal identity does not match the expected shape.')],
    [candidate => candidate.kind === 'UnitMismatch', () =>
      createCaveat('unit-mismatch', 'Unit mismatch', 'Signal unit does not match the expected unit.')],
    [candidate => candidate.kind === 'TrendNotComputed', () =>
      createCaveat('trend-not-computed', 'Trend not computed', 'Trend is not available for this signal.')],
    [candidate => both((value: InterpretationCaveat) => value.kind === 'AnomalyNotComputed', hasReason)(candidate),
      candidate => createCaveat('anomaly-not-computed', 'Anomaly not computed', getCaveatReasonOrDefault('Anomaly is not available for this signal.')(candidate))],
    [candidate => candidate.kind === 'ComparisonWindowUnavailable', () =>
      createCaveat('comparison-window-unavailable', 'Comparison window unavailable', 'Comparison window is not available for this signal.')],
    [() => true, () =>
      createCaveat('trend-not-computed', 'Trend not computed', 'A signal caveat is present.')],
  ])(caveat)

const formatAnalysisCaveatMessage = (caveat: AnalysisCaveat): PresentationCaveatViewModel =>
  cond<[AnalysisCaveat], PresentationCaveatViewModel>([
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'FullSystemBalanceNotComputed', hasReason)(candidate),
      candidate => createCaveat('full-system-balance-not-computed', 'Full system balance not computed', getCaveatReasonOrDefault('Full system balance is not computed.')(candidate)),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'RefineryDataNotIncluded', hasReason)(candidate),
      candidate => createCaveat('refinery-data-not-included', 'Refinery data not included', getCaveatReasonOrDefault('Refinery data is not included.')(candidate)),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'SupplyDataNotIncluded', hasReason)(candidate),
      candidate => createCaveat('supply-data-not-included', 'Supply data not included', getCaveatReasonOrDefault('Supply data is not included.')(candidate)),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'PropagatedInterpretationCaveat', hasSource)(candidate),
      candidate => formatSourceCaveatOrDefault(
        createCaveat('trend-not-computed', 'Trend not computed', 'A propagated interpretation caveat is present.'),
      )(candidate),
    ],
    [
      isPropagatedSystemBalanceCaveat,
      () => createCaveat('system-balance-caveat', 'System balance caveat', 'System balance emitted a caveat.', 'info'),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'MixedEvidence', hasReason)(candidate),
      candidate => createCaveat('trend-not-computed', 'Mixed evidence', getCaveatReasonOrDefault('The live evidence is mixed.')(candidate), 'info'),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'LowConfidence', hasReason)(candidate),
      candidate => createCaveat('trend-not-computed', 'Low confidence', getCaveatReasonOrDefault('Confidence is low.')(candidate), 'warning'),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'PartialInterpretation', hasReason)(candidate),
      candidate => createCaveat('trend-not-computed', 'Partial interpretation', getCaveatReasonOrDefault('Some interpretation context is partial.')(candidate), 'warning'),
    ],
    [
      candidate => both((value: AnalysisCaveat) => value.kind === 'PriceContradiction', hasReason)(candidate),
      candidate => createCaveat('trend-not-computed', 'Price contradiction', getCaveatReasonOrDefault('Price contradicts the balance signal.')(candidate), 'warning'),
    ],
    [() => true, () =>
      createCaveat('trend-not-computed', 'Trend not computed', 'A propagated interpretation caveat is present.')],
  ])(caveat)

const toMaybeJoinedMessages = (separator: string) =>
  ifElse(
    (messages: readonly string[]) => messages.length > 0,
    (messages: readonly string[]) => some<string>(messages.join(separator)),
    () => none(),
  )

const formatCardCaveatLabel = (signal: ContextualizedSignal): Maybe<string> =>
  toMaybeJoinedMessages(' · ')(signal.caveats.map(formatInterpretationCaveatMessage).map(caveat => caveat.message))

const mapCard = (
  kind: SummaryCardKind,
  title: string,
  signal: ContextualizedSignal,
  statusLabel: string,
): SummaryCardViewModel => ({
  kind,
  title,
  valueText: formatSummarySignalValueText(signal.signal),
  statusLabel,
  subtitleText: some(formatSummarySignalSubtitleText(signal.signal)),
  trendLabel: formatSummaryTrendLabel(signal.trend),
  anomalyLabel: some(formatSummaryAnomalyLabel(signal.anomaly)),
  caveatLabel: formatCardCaveatLabel(signal),
  drilldownTarget: none(),
})

const summaryCardDefinitions: ReadonlyArray<Readonly<{
  readonly kind: SummaryCardKind
  readonly title: string
  readonly getSignal: (analysis: WeeklyAnalysis) => ContextualizedSignal
}>> = [
  { kind: 'inventory', title: 'Inventory', getSignal: analysis => analysis.keySignals.inventory },
  { kind: 'price', title: 'WTI price', getSignal: analysis => analysis.keySignals.price },
]

const systemBalanceCard = (
  conditionLabel: string,
  balance: SystemBalanceAnalysis,
): SummaryCardViewModel => ({
  kind: 'system',
  title: 'System balance',
  valueText: balance.balanceState,
  statusLabel: conditionLabel,
  subtitleText: some(`${formatSummaryReportWeekText(balance.reportWeek)} · ${formatSummaryGeographyText(balance.geography)}`),
  trendLabel: none(),
  anomalyLabel: none(),
  caveatLabel: toMaybeJoinedMessages(' · ')(balance.caveats.map(caveat => caveat.kind)),
  drilldownTarget: none(),
})

const systemBalanceCards = (
  analysis: WeeklyAnalysis,
  conditionLabel: string,
): readonly SummaryCardViewModel[] =>
  ifElse(
    hasAnalysisTrace,
    candidate => [systemBalanceCard(conditionLabel, candidate.trace.value.systemBalanceAnalysis)],
    () => [],
  )(analysis)

const mapDisplayState = (analysis: WeeklyAnalysis): SummaryDisplayState =>
  ifElse(
    (candidate: WeeklyAnalysis) => candidate.caveats.length > 0,
    (): SummaryDisplayState => 'partial',
    (): SummaryDisplayState => 'complete',
  )(analysis)

export const mapWeeklyAnalysisToSummaryViewModel = (analysis: WeeklyAnalysis): SummaryViewModel => {
  const conditionLabel = formatSummaryConditionLabel(analysis.condition)

  return {
    reportWeekText: formatSummaryReportWeekText(analysis.reportWeek),
    geographyText: formatSummaryGeographyText(analysis.geography),
    headline: analysis.headline,
    summary: analysis.summary,
    conditionLabel,
    confidenceLabel: formatSummaryConfidenceLabel(analysis.confidence),
    cards: [
      ...systemBalanceCards(analysis, conditionLabel),
      ...summaryCardDefinitions.map(definition =>
        mapCard(definition.kind, definition.title, definition.getSignal(analysis), conditionLabel),
      ),
    ],
    caveats: analysis.caveats.map(formatAnalysisCaveatMessage),
    displayState: mapDisplayState(analysis),
    displayStateMessage: ifElse(
      (candidate: WeeklyAnalysis) => candidate.caveats.length > 0,
      (): Maybe<string> => some('Live output includes caveats.'),
      (): Maybe<string> => none(),
    )(analysis),
  }
}
