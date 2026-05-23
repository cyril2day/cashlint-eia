import { brand } from '@/shared/domain'
import { none, type Maybe } from '@/shared/maybe'
import type { GeographyScope } from '@/contexts/measurement/model/geography-scope'
import type { ReportWeek } from '@/contexts/measurement/model/report-week'
import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import type { BalanceDriver } from '@/contexts/system-balance/model'
import type { AnalysisCondition } from './analysis-condition'
import type { AnalysisConfidence } from './analysis-confidence'
import type { AnalysisCaveat } from './analysis-caveat'
import type { AnalysisSignalAlignment } from './analysis-signal-alignment'
import type { ContextualizedSignalSet } from '@/contexts/interpretation/model/current-signal-set'
import type { SystemBalanceAnalysis } from '@/contexts/system-balance/model'

const weeklyAnalysisBrand = Symbol('WeeklyAnalysis')

export type AnalysisTrace = Readonly<{
  readonly systemBalanceAnalysis: SystemBalanceAnalysis
  readonly contextualizedSignals: ContextualizedSignalSet
}>

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
  readonly keyDrivers: readonly BalanceDriver[]
  readonly historicalQualifications: readonly ContextualizedSignal[]
  readonly supportingSignals: readonly ContextualizedSignal[]
  readonly contradictorySignals: readonly ContextualizedSignal[]
  readonly caveats: readonly AnalysisCaveat[]
  readonly confidence: AnalysisConfidence
  readonly alignment: AnalysisSignalAlignment
  readonly trace: Maybe<AnalysisTrace>
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
  keyDrivers: readonly BalanceDriver[] = [],
  historicalQualifications: readonly ContextualizedSignal[] = [keySignals.inventory, keySignals.price],
  trace: Maybe<AnalysisTrace> = none(),
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
  keyDrivers,
  historicalQualifications,
  trace,
  [weeklyAnalysisBrand]: true,
  ...brand(weeklyAnalysisBrand),
})

export const createFullWeeklyAnalysis = (
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
  keyDrivers: readonly BalanceDriver[],
  historicalQualifications: readonly ContextualizedSignal[],
  trace: Maybe<AnalysisTrace>,
): WeeklyAnalysis => createWeeklyAnalysis(
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
  keyDrivers,
  historicalQualifications,
  trace,
)