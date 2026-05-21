import { brand } from '@/shared/domain'
import { type Maybe, none, some } from '@/shared/maybe'
import { formatSignal, type Signal } from './signal'
import { type Trend } from './trend'
import { type InterpretationAnomalyState } from './anomaly-state'
import { type InterpretationCaveat } from './interpretation-caveat'

const contextualizedSignalBrand = Symbol('ContextualizedSignal')

export type ContextualizedSignal = Readonly<{
  readonly signal: Signal
  readonly trend: Maybe<Trend>
  readonly anomaly: InterpretationAnomalyState
  readonly caveats: readonly InterpretationCaveat[]
  readonly [contextualizedSignalBrand]: true
}>

export const createContextualizedSignal = (
  signal: Signal,
  trend: Maybe<Trend>,
  anomaly: InterpretationAnomalyState,
  caveats: readonly InterpretationCaveat[],
): ContextualizedSignal => ({
  signal,
  trend,
  anomaly,
  caveats,
  [contextualizedSignalBrand]: true,
  ...brand(contextualizedSignalBrand),
})

export const createContextualizedSignalWithoutTrend = (
  signal: Signal,
  anomaly: InterpretationAnomalyState,
  caveats: readonly InterpretationCaveat[],
): ContextualizedSignal => createContextualizedSignal(signal, none(), anomaly, caveats)

export const createContextualizedSignalWithTrend = (
  signal: Signal,
  trend: Trend,
  anomaly: InterpretationAnomalyState,
  caveats: readonly InterpretationCaveat[],
): ContextualizedSignal => createContextualizedSignal(signal, some(trend), anomaly, caveats)

export const formatContextualizedSignal = (contextualizedSignal: ContextualizedSignal): string =>
  [formatSignal(contextualizedSignal.signal), contextualizedSignal.trend.kind, contextualizedSignal.anomaly.kind].join('|')
