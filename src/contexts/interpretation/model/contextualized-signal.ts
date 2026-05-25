import { brand } from '@/shared/domain'
import { type Maybe, none, some } from '@/shared/maybe'
import { formatSignal, type Signal } from '@/contexts/interpretation/model/signal'
import { type Trend } from '@/contexts/interpretation/model/trend'
import { type InterpretationAnomalyState } from '@/contexts/interpretation/model/anomaly-state'
import { type InterpretationCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import { type BaselineResult } from '@/contexts/interpretation/model/baseline'

const contextualizedSignalBrand = Symbol('ContextualizedSignal')

export type ContextualizedSignal = Readonly<{
  readonly signal: Signal
  readonly trend: Maybe<Trend>
  readonly baseline: BaselineResult
  readonly anomaly: InterpretationAnomalyState
  readonly caveats: readonly InterpretationCaveat[]
  readonly [contextualizedSignalBrand]: true
}>

export const createContextualizedSignal = (
  signal: Signal,
  trend: Maybe<Trend>,
  baseline: BaselineResult,
  anomaly: InterpretationAnomalyState,
  caveats: readonly InterpretationCaveat[],
): ContextualizedSignal => ({
  signal,
  trend,
  baseline,
  anomaly,
  caveats,
  [contextualizedSignalBrand]: true,
  ...brand(contextualizedSignalBrand),
})

export const createContextualizedSignalWithoutTrend = (
  signal: Signal,
  anomaly: InterpretationAnomalyState,
  caveats: readonly InterpretationCaveat[],
): ContextualizedSignal => createContextualizedSignal(signal, none(), { kind: 'NotComputed', reason: 'NotComputed' }, anomaly, caveats)

export const createContextualizedSignalWithTrend = (
  signal: Signal,
  trend: Trend,
  anomaly: InterpretationAnomalyState,
  caveats: readonly InterpretationCaveat[],
): ContextualizedSignal => createContextualizedSignal(signal, some(trend), { kind: 'NotComputed', reason: 'NotComputed' }, anomaly, caveats)

export const formatContextualizedSignal = (contextualizedSignal: ContextualizedSignal): string =>
  [formatSignal(contextualizedSignal.signal), contextualizedSignal.trend.kind, contextualizedSignal.anomaly.kind].join('|')
