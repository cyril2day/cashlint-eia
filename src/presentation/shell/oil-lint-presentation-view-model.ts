import { cond } from '@/shared/fp'
import { none, some } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from '../contracts/presentation-caveat-view-model'
import type { SummaryCardViewModel } from '../contracts/summary-card-view-model'
import type { SummaryViewModel } from '../contracts/summary-view-model'

const reportWeekText = '2026-05-19'
const geographyText = 'USTotal'
const summarySubtitleText = `${reportWeekText} · ${geographyText}`

const summaryDisplayStateMessageByKind = cond<
  [SummaryViewModel['displayState']],
  string
>([
  [candidate => candidate === 'empty', () => 'No supported summary data is available for this scope.'],
  [candidate => candidate === 'partial', () => 'Walking-skeleton output includes caveats.'],
  [candidate => candidate === 'error', () => 'Safe error content is available when needed.'],
  [() => true, () => 'Summary output is complete.'],
])

const inventoryCard: SummaryCardViewModel = {
  kind: 'inventory',
  title: 'Inventory',
  valueText: '80 ThousandBarrels',
  statusLabel: 'Unknown',
  subtitleText: some(summarySubtitleText),
  trendLabel: none(),
  anomalyLabel: some('Inventory anomaly is not computed yet.'),
  caveatLabel: none(),
  drilldownTarget: none(),
}

const priceCard: SummaryCardViewModel = {
  kind: 'price',
  title: 'WTI price',
  valueText: '72 USDPerBarrel',
  statusLabel: 'Unknown',
  subtitleText: some(summarySubtitleText),
  trendLabel: some('Up'),
  anomalyLabel: some('Price anomaly is not computed yet.'),
  caveatLabel: none(),
  drilldownTarget: none(),
}

const presentationCaveats: readonly PresentationCaveatViewModel[] = [
  {
    kind: 'full-system-balance-not-computed',
    title: 'Full system balance not computed',
    message: 'Full system balance is not part of this weekly run yet.',
    severity: 'warning',
  },
  {
    kind: 'refinery-data-not-included',
    title: 'Refinery data not included',
    message: 'Refinery data is not part of this weekly run yet.',
    severity: 'warning',
  },
  {
    kind: 'supply-data-not-included',
    title: 'Supply data not included',
    message: 'Supply data is not included.',
    severity: 'warning',
  },
]

export const createOilLintPresentationViewModel = (displayState: SummaryViewModel['displayState']): SummaryViewModel => ({
  reportWeekText,
  geographyText,
  headline: 'Walking-skeleton summary ready for presentation',
  summary: 'Inventory and price output are rendered from the presentation contract, with caveats kept visible.',
  conditionLabel: 'Unknown',
  confidenceLabel: 'Medium',
  cards: [inventoryCard, priceCard],
  caveats: presentationCaveats,
  displayState,
  displayStateMessage: some(summaryDisplayStateMessageByKind(displayState)),
})

export const oilLintPresentationViewModel: SummaryViewModel = createOilLintPresentationViewModel('partial')
