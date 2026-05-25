import type { Signal } from '@/contexts/interpretation/model/signal'
import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'

export type CurrentSignalSet = Readonly<{
  readonly inventory: Signal
  readonly price: Signal
}>

export type ContextualizedSignalSet = Readonly<{
  readonly inventory: ContextualizedSignal
  readonly price: ContextualizedSignal
}>
