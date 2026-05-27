import type { AnalysisCondition } from '@/contexts/analysis/model/analysis-condition'
import type { AnalysisConfidence } from '@/contexts/analysis/model/analysis-confidence'
import type { InterpretationAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import type { BalanceCaveatKind, BalanceDriverKind, SystemBalanceState } from '@/contexts/system-balance/model'
import { cond } from '@/shared/fp'
import { map } from '@/shared/maybe'
import type { Trend } from '@/contexts/interpretation/model/trend'
import { formatTrendDirection } from '@/contexts/measurement/model/trend-direction'

const summaryConditionLabelByKind: Readonly<Record<AnalysisCondition['condition'], string>> = {
  Tightening: 'Tightening',
  Loosening: 'Loosening',
  Balanced: 'Balanced',
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
  cond<[InterpretationAnomalyState], string>([
    [value => value.kind === 'NotComputed', value => String(Reflect.get(value, 'reason'))],
    [value => value.kind === 'Anomalous', value => String(Reflect.get(value, 'direction'))],
    [() => true, () => 'Normal'],
  ])(anomaly)

export const formatBalanceDriverLabel = (kind: BalanceDriverKind): string =>
  cond<[BalanceDriverKind], string>([
    [value => value === 'InventoryDraw', () => 'Inventory draw'],
    [value => value === 'InventoryBuild', () => 'Inventory build'],
    [value => value === 'StrongerRefineryDemand', () => 'Stronger refinery runs'],
    [value => value === 'WeakerRefineryDemand', () => 'Weaker refinery runs'],
    [value => value === 'IncreasedProduction', () => 'Higher domestic production'],
    [value => value === 'DecreasedProduction', () => 'Lower domestic production'],
    [value => value === 'IncreasedImports', () => 'Higher crude imports'],
    [value => value === 'DecreasedImports', () => 'Lower crude imports'],
    [value => value === 'IncreasedExports', () => 'Higher crude exports'],
    [value => value === 'DecreasedExports', () => 'Lower crude exports'],
    [() => true, () => 'Supply pressure movement'],
  ])(kind)

export const formatBalanceCaveatTitle = (kind: BalanceCaveatKind): string =>
  cond<[BalanceCaveatKind], string>([
    [value => value === 'SimplifiedCrudeBalance', () => 'Simplified crude balance'],
    [value => value === 'RateToStockComparisonLimitation', () => 'Rate-to-stock comparison limit'],
    [value => value === 'MissingOptionalComponent', () => 'Missing optional component'],
    [value => value === 'MixedSignalDirection', () => 'Mixed signal direction'],
    [value => value === 'PartialGeographyCoverage', () => 'Partial geography coverage'],
    [() => true, () => 'Missing evidence limits the read'],
  ])(kind)

export const formatBalanceCaveatMessage = (kind: BalanceCaveatKind): string =>
  cond<[BalanceCaveatKind], string>([
    [value => value === 'SimplifiedCrudeBalance', () => 'The balance uses a simplified U.S. crude equation rather than a full refinery accounting model.'],
    [value => value === 'RateToStockComparisonLimitation', () => 'Flow rates and stock changes are compared cautiously because they are measured on different bases.'],
    [value => value === 'MissingOptionalComponent', () => 'One optional balance component was unavailable, so the read keeps that limitation visible.'],
    [value => value === 'MixedSignalDirection', () => 'The balance drivers do not all point in the same direction.'],
    [value => value === 'PartialGeographyCoverage', () => 'The source coverage is partial for the selected geography.'],
    [() => true, () => 'The balance state is conservative because required evidence is incomplete.'],
  ])(kind)

export const formatSystemBalanceStateLabel = (state: SystemBalanceState): string =>
  cond<[SystemBalanceState], string>([
    [value => value === 'Tightening', () => 'Tightening balance'],
    [value => value === 'Loosening', () => 'Loosening balance'],
    [value => value === 'Balanced', () => 'Balanced market'],
    [value => value === 'Mixed', () => 'Mixed signal'],
    [() => true, () => 'Evidence incomplete'],
  ])(state)
