import { brand } from '@/shared/domain'
import type { InterpretationCaveat } from '@/contexts/interpretation/model/interpretation-caveat'

const analysisCaveatBrand = Symbol('AnalysisCaveat')

export type AnalysisCaveat =
  | Readonly<{ readonly kind: 'FullSystemBalanceNotComputed'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'RefineryDataNotIncluded'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'SupplyDataNotIncluded'; readonly reason: string; readonly [analysisCaveatBrand]: true }>
  | Readonly<{ readonly kind: 'PropagatedInterpretationCaveat'; readonly source: InterpretationCaveat; readonly [analysisCaveatBrand]: true }>

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

export const formatAnalysisCaveat = (caveat: AnalysisCaveat): string => caveat.kind