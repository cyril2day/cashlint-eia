import type { AnalysisCondition } from '@/contexts/analysis/model/analysis-condition'
import type { AnalysisConfidence } from '@/contexts/analysis/model/analysis-confidence'
import type { InterpretationAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import { map } from '@/shared/maybe'
import type { Trend } from '@/contexts/interpretation/model/trend'
import { formatTrendDirection } from '@/contexts/measurement/model/trend-direction'

export const oilLintPresentationDisplayLabels: Readonly<{
  readonly placeholder: string
  readonly pendingSummaryValue: string
  readonly pendingCondition: string
  readonly pendingConfidence: string
}> = {
  placeholder: 'Placeholder only',
  pendingSummaryValue: 'Pending SummaryViewModel',
  pendingCondition: 'Condition pending',
  pendingConfidence: 'Confidence pending',
}

export const formatSummaryConditionLabel = (condition: AnalysisCondition): string => condition.condition

export const formatSummaryConfidenceLabel = (confidence: AnalysisConfidence): string => confidence.confidence

export const formatSummaryTrendLabel = map((trend: Trend) => formatTrendDirection(trend.direction))

export const formatSummaryAnomalyLabel = (anomaly: InterpretationAnomalyState): string =>
  anomaly.reason