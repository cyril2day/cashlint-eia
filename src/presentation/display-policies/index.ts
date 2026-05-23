import type { AnalysisCondition } from '@/contexts/analysis/model/analysis-condition'
import type { AnalysisConfidence } from '@/contexts/analysis/model/analysis-confidence'
import type { InterpretationAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import { map } from '@/shared/maybe'
import type { Trend } from '@/contexts/interpretation/model/trend'
import { formatTrendDirection } from '@/contexts/measurement/model/trend-direction'

const summaryConditionLabelByKind: Readonly<Record<AnalysisCondition['condition'], string>> = {
  Tightening: 'Tightening',
  Loosening: 'Loosening',
  Mixed: 'Mixed',
  Unknown: 'Unknown',
}

const summaryConfidenceLabelByKind: Readonly<Record<AnalysisConfidence['confidence'], string>> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Unknown: 'Unknown',
}

export const formatSummaryConditionLabel = (condition: AnalysisCondition): string =>
  summaryConditionLabelByKind[condition.condition]

export const formatSummaryConfidenceLabel = (confidence: AnalysisConfidence): string =>
  summaryConfidenceLabelByKind[confidence.confidence]

export const formatSummaryTrendLabel = map((trend: Trend) => formatTrendDirection(trend.direction))

export const formatSummaryAnomalyLabel = (anomaly: InterpretationAnomalyState): string =>
  anomaly.reason