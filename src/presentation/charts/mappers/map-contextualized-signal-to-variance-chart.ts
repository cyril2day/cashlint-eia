import type { ContextualizedSignal } from '@/contexts/interpretation/model/contextualized-signal'
import { formatDecimal, formatPercentageDecimal } from '@/shared/decimal'
import { cond, ifElse } from '@/shared/fp'
import { matchMaybe, none, some, type Maybe } from '@/shared/maybe'
import type { ChartDisplayState, VarianceChartEntryViewModel, VarianceChartViewModel, VarianceReferenceViewModel } from '../contracts'
import {
  baselineAverageMarker,
  chartCaveatsFromSignal,
  chartDisplayStateFromSignal,
  signalValueLabel,
  unitLabelFromSignal,
} from './shared'

type VarianceChartMapperInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly subtitle: Maybe<string>
  readonly signal: ContextualizedSignal
  readonly referenceLabel: string
  readonly referenceSemantics: string
}>

const varianceDirectionLabel = (variance: number): string =>
  cond<[number], string>([
    [candidate => candidate > 0, () => 'Above reference'],
    [candidate => candidate < 0, () => 'Below reference'],
    [() => true, () => 'At reference'],
  ])(variance)

const variancePercentageLabel = (
  actualValue: number,
  referenceValue: number,
): Maybe<string> =>
  ifElse(
    (candidate: number) => candidate === 0,
    () => none(),
    candidate => some(`${formatPercentageDecimal(((actualValue - candidate) / candidate) * 100)}%`),
  )(referenceValue)

const toReference = (
  input: VarianceChartMapperInput,
  referenceValue: number,
): VarianceReferenceViewModel => ({
  label: input.referenceLabel,
  value: referenceValue,
  valueLabel: formatDecimal(referenceValue),
})

const toVarianceEntry = (
  input: VarianceChartMapperInput,
  referenceValue: number,
): VarianceChartEntryViewModel => {
  const varianceAmount = input.signal.signal.value - referenceValue

  return {
    category: input.title,
    actualValue: input.signal.signal.value,
    actualValueLabel: signalValueLabel(input.signal),
    reference: toReference(input, referenceValue),
    varianceAmount,
    varianceAmountLabel: formatDecimal(varianceAmount),
    variancePercentageLabel: variancePercentageLabel(input.signal.signal.value, referenceValue),
    directionLabel: varianceDirectionLabel(varianceAmount),
    caveats: chartCaveatsFromSignal(input.signal),
  }
}

const displayStateFromEntries = (
  signal: ContextualizedSignal,
  entries: readonly VarianceChartEntryViewModel[],
): ChartDisplayState =>
  ifElse(
    (candidate: readonly VarianceChartEntryViewModel[]) => candidate.length > 0,
    () => chartDisplayStateFromSignal(signal),
    (): ChartDisplayState => 'NotComputed',
  )(entries)

export const mapContextualizedSignalToVarianceChart = (input: VarianceChartMapperInput): VarianceChartViewModel => {
  const entries = matchMaybe<number, readonly VarianceChartEntryViewModel[]>({
    Some: referenceValue => [toVarianceEntry(input, referenceValue)],
    None: () => [],
  })(baselineAverageMarker(input.signal, average => average))

  return {
    id: input.id,
    title: input.title,
    subtitle: input.subtitle,
    unitLabel: unitLabelFromSignal(input.signal),
    referenceSemantics: input.referenceSemantics,
    entries,
    caveats: chartCaveatsFromSignal(input.signal),
    accessibilitySummary: `${input.title}, ${input.referenceSemantics}`,
    displayState: displayStateFromEntries(input.signal, entries),
  }
}
