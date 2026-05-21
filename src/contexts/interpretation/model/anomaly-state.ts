import { brand } from '@/shared/domain'

const anomalyStateBrand = Symbol('InterpretationAnomalyState')

export type NotComputedAnomalyState = Readonly<{
  readonly kind: 'NotComputed'
  readonly reason: string
  readonly [anomalyStateBrand]: true
}>

export type InterpretationAnomalyState = NotComputedAnomalyState

export const createNotComputedAnomalyState = (reason: string): NotComputedAnomalyState => ({
  kind: 'NotComputed',
  reason,
  [anomalyStateBrand]: true,
  ...brand(anomalyStateBrand),
})
