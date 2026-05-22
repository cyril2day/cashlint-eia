import { brand } from '@/shared/domain'
import type { GeographyScope } from '@/contexts/measurement/model/geography-scope'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'
import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import type { AnalysisCondition } from './analysis-condition'
import type { AnalysisConfidence } from './analysis-confidence'
import type { AnalysisCaveat } from './analysis-caveat'
import type { AnalysisSignalAlignment } from './analysis-signal-alignment'

const weeklyAnalysisBrand = Symbol('WeeklyAnalysis')

export type AnalysisKeySignals = Readonly<{
  readonly inventory: ContextualizedSignal
  readonly price: ContextualizedSignal
}>

export type WeeklyAnalysis = Readonly<{
  readonly reportWeek: ReportWeek
  readonly geography: GeographyScope
  readonly condition: AnalysisCondition
  readonly headline: string
  readonly summary: string
  readonly explanation: string
  readonly keySignals: AnalysisKeySignals
  readonly supportingSignals: readonly ContextualizedSignal[]
  readonly contradictorySignals: readonly ContextualizedSignal[]
  readonly caveats: readonly AnalysisCaveat[]
  readonly confidence: AnalysisConfidence
  readonly alignment: AnalysisSignalAlignment
  readonly [weeklyAnalysisBrand]: true
}>

export const createWeeklyAnalysis = (
  reportWeek: ReportWeek,
  geography: GeographyScope,
  condition: AnalysisCondition,
  headline: string,
  summary: string,
  explanation: string,
  keySignals: AnalysisKeySignals,
  supportingSignals: readonly ContextualizedSignal[],
  contradictorySignals: readonly ContextualizedSignal[],
  caveats: readonly AnalysisCaveat[],
  confidence: AnalysisConfidence,
  alignment: AnalysisSignalAlignment,
): WeeklyAnalysis => ({
  reportWeek,
  geography,
  condition,
  headline,
  summary,
  explanation,
  keySignals,
  supportingSignals,
  contradictorySignals,
  caveats,
  confidence,
  alignment,
  [weeklyAnalysisBrand]: true,
  ...brand(weeklyAnalysisBrand),
})