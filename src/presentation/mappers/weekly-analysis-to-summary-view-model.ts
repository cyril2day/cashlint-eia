import type { WeeklyAnalysis } from '@/contexts/analysis/model/weekly-analysis'
import type { AnalysisCaveat } from '@/contexts/analysis/model/analysis-caveat'
import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { formatSummaryConditionLabel, formatSummaryConfidenceLabel, formatSummaryTrendLabel, formatSummaryAnomalyLabel } from '@/presentation/display-policies'
import {
  formatSummaryGeographyText,
  formatSummaryReportWeekText,
  formatSummarySignalSubtitleText,
  formatSummarySignalValueText,
} from '@/presentation/formatting-policies'
import { cond } from '@/shared/fp'
import { none, some, type Maybe } from '@/shared/maybe'

import type { PresentationCaveatKind, PresentationCaveatViewModel } from '../contracts/presentation-caveat-view-model'
import type { SummaryCardKind, SummaryCardViewModel } from '../contracts/summary-card-view-model'
import type { SummaryDisplayState, SummaryViewModel } from '../contracts/summary-view-model'

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

const formatInterpretationCaveatMessage: (caveat: ContextualizedSignal['caveats'][number]) => PresentationCaveatViewModel = cond([
  [
    (caveat: ContextualizedSignal['caveats'][number]) => caveat.kind === 'MissingPreviousObservation',
    () => createCaveat('missing-previous-observation', 'Missing previous observation', 'No previous observation is available.'),
  ],
  [
    (caveat: ContextualizedSignal['caveats'][number]) => caveat.kind === 'IdentityMismatch',
    () => createCaveat('identity-mismatch', 'Identity mismatch', 'Signal identity does not match the expected shape.'),
  ],
  [
    (caveat: ContextualizedSignal['caveats'][number]) => caveat.kind === 'UnitMismatch',
    () => createCaveat('unit-mismatch', 'Unit mismatch', 'Signal unit does not match the expected unit.'),
  ],
  [
    (caveat: ContextualizedSignal['caveats'][number]) => caveat.kind === 'TrendNotComputed',
    () => createCaveat('trend-not-computed', 'Trend not computed', 'Trend is not available for this signal.'),
  ],
  [
    (caveat: ContextualizedSignal['caveats'][number]) => caveat.kind === 'AnomalyNotComputed',
    () => createCaveat('anomaly-not-computed', 'Anomaly not computed', 'Anomaly is not available for this signal.'),
  ],
  [
    (caveat: ContextualizedSignal['caveats'][number]) => caveat.kind === 'ComparisonWindowUnavailable',
    () => createCaveat('comparison-window-unavailable', 'Comparison window unavailable', 'Comparison window is not available for this signal.'),
  ],
])

const formatAnalysisCaveatMessage: (caveat: AnalysisCaveat) => PresentationCaveatViewModel = cond([
  [
    (caveat: AnalysisCaveat) => caveat.kind === 'FullSystemBalanceNotComputed',
    () => createCaveat('full-system-balance-not-computed', 'Full system balance not computed', 'Full system balance is not computed.'),
  ],
  [
    (caveat: AnalysisCaveat) => caveat.kind === 'RefineryDataNotIncluded',
    () => createCaveat('refinery-data-not-included', 'Refinery data not included', 'Refinery data is not included.'),
  ],
  [
    (caveat: AnalysisCaveat) => caveat.kind === 'SupplyDataNotIncluded',
    () => createCaveat('supply-data-not-included', 'Supply data not included', 'Supply data is not included.'),
  ],
  [
    (caveat: AnalysisCaveat) => caveat.kind === 'PropagatedInterpretationCaveat',
    () => createCaveat('trend-not-computed', 'Trend not computed', 'A propagated interpretation caveat is present.'),
  ],
])

const formatCardCaveatLabel = (signal: ContextualizedSignal): Maybe<string> =>
  cond<[readonly string[]], Maybe<string>>([
    [messages => messages.length > 0, messages => some<string>(messages.join(' · '))],
    [() => true, () => none()],
  ])(signal.caveats.map(formatInterpretationCaveatMessage).map(caveat => caveat.message))

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

const mapDisplayState = (analysis: WeeklyAnalysis): SummaryDisplayState =>
  cond<[WeeklyAnalysis], SummaryDisplayState>([
    [candidate => candidate.caveats.length > 0, () => 'partial'],
    [() => true, () => 'complete'],
  ])(analysis)

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
      mapCard('inventory', 'Inventory', analysis.keySignals.inventory, conditionLabel),
      mapCard('price', 'WTI price', analysis.keySignals.price, conditionLabel),
    ],
    caveats: analysis.caveats.map(formatAnalysisCaveatMessage),
    displayState: mapDisplayState(analysis),
    displayStateMessage: cond<[WeeklyAnalysis], Maybe<string>>([
      [candidate => candidate.caveats.length > 0, () => some<string>('Walking-skeleton output includes caveats.')],
      [() => true, () => none()],
    ])(analysis),
  }
}