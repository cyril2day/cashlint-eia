import type { SystemBalanceAnalysis } from '@/contexts/system-balance'
import { formatDecimal, formatWholeDecimal } from '@/shared/decimal'
import { cond } from '@/shared/fp'
import { none, some } from '@/shared/maybe'
import { formatBalanceCaveatMessage, formatBalanceCaveatTitle, formatBalanceDriverLabel, formatSystemBalanceStateLabel } from '@/presentation/display-policies'
import type { BarChartViewModel, ChartCaveatViewModel, ChartDisplayState } from '@/presentation/charts/contracts'
import { mapBarChartInput, type BarChartPointInput } from '@/presentation/charts/mappers/map-bar-chart-input'
import { friendlyMeasurementUnit } from '@/presentation/charts/mappers/shared'

type SystemBalanceDriverChartSource = Pick<SystemBalanceAnalysis, 'balanceState' | 'drivers' | 'caveats'>

type SystemBalanceDriverBarChartInput = Readonly<{
  readonly id: string
  readonly title: string
  readonly analysis: SystemBalanceDriverChartSource
}>

const displayStateFromAnalysis = (analysis: SystemBalanceDriverChartSource): ChartDisplayState =>
  cond<[SystemBalanceDriverChartSource], ChartDisplayState>([
    [candidate => candidate.drivers.length === 0, () => 'Empty'],
    [candidate => candidate.caveats.length > 0, () => 'Partial'],
    [() => true, () => 'Complete'],
  ])(analysis)

const mapBalanceCaveat = (caveat: SystemBalanceAnalysis['caveats'][number]): ChartCaveatViewModel => ({
  kind: 'system-balance-caveat',
  title: formatBalanceCaveatTitle(caveat.kind),
  message: formatBalanceCaveatMessage(caveat.kind),
  severity: 'warning',
})

const mapDriver = (driver: SystemBalanceAnalysis['drivers'][number]): BarChartPointInput => ({
  category: formatBalanceDriverLabel(driver.kind),
  value: driver.value,
  valueLabel: `${formatDecimal(driver.value)} ${friendlyMeasurementUnit(driver.unit)}`,
  caveats: [],
})

export const mapSystemBalanceAnalysisToDriverBarChart = (
  input: SystemBalanceDriverBarChartInput,
): BarChartViewModel => {
  const caveats = input.analysis.caveats.map(mapBalanceCaveat)
  const chart = mapBarChartInput({
    id: input.id,
    title: input.title,
    subtitle: some(formatSystemBalanceStateLabel(input.analysis.balanceState)),
    unitLabel: none(),
    ordering: 'InputOrder',
    points: input.analysis.drivers.map(mapDriver),
    caveats,
    accessibilitySummary: `Physical balance driver chart with ${formatWholeDecimal(input.analysis.drivers.length)} driver(s), ${formatSystemBalanceStateLabel(input.analysis.balanceState).toLowerCase()}, and ${formatWholeDecimal(input.analysis.caveats.length)} caveat(s).`,
  })

  return {
    ...chart,
    displayState: displayStateFromAnalysis(input.analysis),
  }
}
