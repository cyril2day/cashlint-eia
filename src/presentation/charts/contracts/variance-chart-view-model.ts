import type { Maybe } from '@/shared/maybe'
import type { ChartCaveatViewModel } from '@/presentation/charts/contracts/chart-caveat-view-model'
import type { ChartDisplayState } from '@/presentation/charts/contracts/chart-display-state'

export type VarianceReferenceViewModel = Readonly<{
  readonly label: string
  readonly value: number
  readonly valueLabel: string
}>

export type VarianceChartEntryViewModel = Readonly<{
  readonly category: string
  readonly actualValue: number
  readonly actualValueLabel: string
  readonly reference: VarianceReferenceViewModel
  readonly varianceAmount: number
  readonly varianceAmountLabel: string
  readonly variancePercentageLabel: Maybe<string>
  readonly directionLabel: string
  readonly caveats: readonly ChartCaveatViewModel[]
}>

export type VarianceChartViewModel = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly unitLabel: Maybe<string>
  readonly referenceSemantics: string
  readonly entries: readonly VarianceChartEntryViewModel[]
  readonly caveats: readonly ChartCaveatViewModel[]
  readonly accessibilitySummary: string
  readonly displayState: ChartDisplayState
}>
