import type { SystemBalanceAnalysis } from '@/contexts/system-balance'
import { formatMeasurementUnit } from '@/contexts/measurement/model'
import { cond } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import type { BarChartViewModel, ChartCaveatViewModel, ChartDisplayState } from '../contracts'
import { mapBarChartInput, type BarChartPointInput } from './map-bar-chart-input'

type SystemBalanceDriverChartSource = Pick<SystemBalanceAnalysis, 'balanceState' | 'drivers' | 'caveats'>

type SystemBalanceDriverBarChartInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly analysis: SystemBalanceDriverChartSource
}>

const balanceDriverLabels: Readonly<Record<SystemBalanceAnalysis['drivers'][number]['kind'], string>> = {
  InventoryDraw: 'Inventory draw',
  InventoryBuild: 'Inventory build',
  StrongerRefineryDemand: 'Stronger refinery demand',
  WeakerRefineryDemand: 'Weaker refinery demand',
  IncreasedProduction: 'Increased production',
  DecreasedProduction: 'Decreased production',
  IncreasedImports: 'Increased imports',
  DecreasedImports: 'Decreased imports',
  IncreasedExports: 'Increased exports',
  DecreasedExports: 'Decreased exports',
  SupplyPressureMovement: 'Supply pressure movement',
}

const balanceCaveatTitles: Readonly<Record<SystemBalanceAnalysis['caveats'][number]['kind'], string>> = {
  SimplifiedCrudeBalance: 'Simplified crude balance',
  RateToStockComparisonLimitation: 'Rate-to-stock comparison limitation',
  MissingOptionalComponent: 'Missing optional component',
  MixedSignalDirection: 'Mixed signal direction',
  PartialGeographyCoverage: 'Partial geography coverage',
  UnknownStateDueToMissingEvidence: 'Unknown state due to missing evidence',
}

const displayStateFromAnalysis = (analysis: SystemBalanceDriverChartSource): ChartDisplayState =>
  cond<[SystemBalanceDriverChartSource], ChartDisplayState>([
    [candidate => candidate.drivers.length === 0, () => 'Empty'],
    [candidate => candidate.caveats.length > 0, () => 'Partial'],
    [() => true, () => 'Complete'],
  ])(analysis)

const mapBalanceCaveat = (caveat: SystemBalanceAnalysis['caveats'][number]): ChartCaveatViewModel => ({
  kind: caveat.kind,
  title: balanceCaveatTitles[caveat.kind],
  message: balanceCaveatTitles[caveat.kind],
  severity: 'warning',
})

const mapDriver = (driver: SystemBalanceAnalysis['drivers'][number]): BarChartPointInput => ({
  category: balanceDriverLabels[driver.kind],
  value: driver.value,
  valueLabel: `${String(driver.value)} ${formatMeasurementUnit(driver.unit)}`,
  caveats: [],
})

export const mapSystemBalanceAnalysisToDriverBarChart = (
  input: SystemBalanceDriverBarChartInput,
): BarChartViewModel => {
  const caveats = input.analysis.caveats.map(mapBalanceCaveat)
  const chart = mapBarChartInput({
    id: input.id,
    title: input.title,
    subtitle: some(`Balance state ${input.analysis.balanceState}`),
    unitLabel: none(),
    ordering: 'InputOrder',
    points: input.analysis.drivers.map(mapDriver),
    caveats,
    accessibilitySummary: `System balance driver chart with ${String(input.analysis.drivers.length)} driver(s), balance state ${input.analysis.balanceState}, and ${String(input.analysis.caveats.length)} caveat(s).`,
  })

  return {
    ...chart,
    displayState: displayStateFromAnalysis(input.analysis),
  }
}
