import { brand } from '@/shared/domain'
import type { Decimal } from '@/shared/decimal'
import type { MeasurementUnit } from '@/contexts/measurement/model/measurement-unit'
import type { SignalIdentity } from '@/contexts/interpretation/model/signal-identity'

const baselineBrand = Symbol('Baseline')

export type Baseline = Readonly<{
  readonly identity: SignalIdentity
  readonly observationCount: number
  readonly average: Decimal
  readonly dispersion: Decimal
  readonly unit: MeasurementUnit
  readonly [baselineBrand]: true
}>

export type BaselineResult =
  | Readonly<{ readonly kind: 'Computed'; readonly baseline: Baseline }>
  | Readonly<{ readonly kind: 'NotComputed'; readonly reason: string }>

export const createBaseline = (
  identity: SignalIdentity,
  observationCount: number,
  average: Decimal,
  dispersion: Decimal,
  unit: MeasurementUnit,
): Baseline => ({
  identity,
  observationCount,
  average,
  dispersion,
  unit,
  [baselineBrand]: true,
  ...brand(baselineBrand),
})

export const createComputedBaselineResult = (baseline: Baseline): BaselineResult => ({
  kind: 'Computed',
  baseline,
})

export const createNotComputedBaselineResult = (reason: string): BaselineResult => ({
  kind: 'NotComputed',
  reason,
})
