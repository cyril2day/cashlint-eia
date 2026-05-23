import { brand } from '@/shared/domain'

const anomalyStateBrand = Symbol('InterpretationAnomalyState')

export type NotComputedAnomalyState = Readonly<{
  readonly kind: 'NotComputed'
  readonly reason: string
  readonly [anomalyStateBrand]: true
}>

export type NormalAnomalyState = Readonly<{
  readonly kind: 'Normal'
  readonly score: number
  readonly [anomalyStateBrand]: true
}>

export type AnomalousAnomalyState = Readonly<{
  readonly kind: 'Anomalous'
  readonly direction: 'HighSide' | 'LowSide'
  readonly score: number
  readonly [anomalyStateBrand]: true
}>

export type InterpretationAnomalyState =
  | NormalAnomalyState
  | AnomalousAnomalyState
  | NotComputedAnomalyState

export const createNotComputedAnomalyState = (reason: string): NotComputedAnomalyState => ({
  kind: 'NotComputed',
  reason,
  [anomalyStateBrand]: true,
  ...brand(anomalyStateBrand),
})

export const createNormalAnomalyState = (score: number): NormalAnomalyState => ({
  kind: 'Normal',
  score,
  [anomalyStateBrand]: true,
  ...brand(anomalyStateBrand),
})

export const createAnomalousAnomalyState = (
  direction: AnomalousAnomalyState['direction'],
  score: number,
): AnomalousAnomalyState => ({
  kind: 'Anomalous',
  direction,
  score,
  [anomalyStateBrand]: true,
  ...brand(anomalyStateBrand),
})
