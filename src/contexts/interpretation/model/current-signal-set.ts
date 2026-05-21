import type { Signal } from './signal'
import type { ContextualizedSignal } from './contextualized-signal'

export type CurrentSignalSet = Readonly<{
  readonly inventory: Signal
  readonly price: Signal
}>

export type ContextualizedSignalSet = Readonly<{
  readonly inventory: ContextualizedSignal
  readonly price: ContextualizedSignal
}>
