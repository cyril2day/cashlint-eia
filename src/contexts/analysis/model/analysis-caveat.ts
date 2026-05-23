import { brand } from '@/shared/domain'
import type { InterpretationCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import type { BalanceCaveat } from '@/contexts/system-balance/model'

const analysisCaveatBrand = Symbol('AnalysisCaveat')

export type AnalysisCaveat =
  | Readonly<{ readonly kind: 'FullSystemBalanceNotComputed'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'RefineryDataNotIncluded'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'SupplyDataNotIncluded'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'PropagatedInterpretationCaveat'; readonly source: InterpretationCaveat; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'PropagatedSystemBalanceCaveat'; readonly source: BalanceCaveat; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'MixedEvidence'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'LowConfidence'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'PartialInterpretation'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'PriceContradiction'; readonly reason: string; readonly [analysisCaveatBrand]: true }>

export const createFullSystemBalanceNotComputedCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'FullSystemBalanceNotComputed',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createRefineryDataNotIncludedCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'RefineryDataNotIncluded',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createSupplyDataNotIncludedCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'SupplyDataNotIncluded',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createPropagatedInterpretationCaveat = (source: InterpretationCaveat): AnalysisCaveat => ({
  kind: 'PropagatedInterpretationCaveat',
  source,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createPropagatedSystemBalanceCaveat = (source: BalanceCaveat): AnalysisCaveat => ({
  kind: 'PropagatedSystemBalanceCaveat',
  source,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createMixedEvidenceCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'MixedEvidence',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createLowConfidenceCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'LowConfidence',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createPartialInterpretationCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'PartialInterpretation',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const createPriceContradictionCaveat = (reason: string): AnalysisCaveat => ({
  kind: 'PriceContradiction',
  reason,
  [analysisCaveatBrand]: true,
  ...brand(analysisCaveatBrand),
})

export const formatAnalysisCaveat = (caveat: AnalysisCaveat): string => caveat.kind