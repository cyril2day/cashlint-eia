import { oilLintPresentationDisplayLabels } from '@/presentation/display-policies'
import { none, some } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from '../contracts/presentation-caveat-view-model'
import type { SummaryCardViewModel } from '../contracts/summary-card-view-model'
import type { SummaryViewModel } from '../contracts/summary-view-model'

const reportWeekText = '2026-05-19'
const geographyText = 'US Total'
const summarySubtitleText = `${reportWeekText} · ${geographyText}`

const inventoryCard: SummaryCardViewModel = {
  kind: 'inventory',
  title: 'Inventory',
  valueText: '80 ThousandBarrels',
  statusLabel: 'Pending',
  subtitleText: some(summarySubtitleText),
  trendLabel: none(),
  anomalyLabel: some('Inventory anomaly is not computed yet.'),
  caveatLabel: some('Inventory caveat pending'),
  drilldownTarget: none(),
}

const priceCard: SummaryCardViewModel = {
  kind: 'price',
  title: 'WTI price',
  valueText: '72 USDPerBarrel',
  statusLabel: 'Pending',
  subtitleText: some(summarySubtitleText),
  trendLabel: some('Up'),
  anomalyLabel: some('Price anomaly is not computed yet.'),
  caveatLabel: some('Price caveat pending'),
  drilldownTarget: none(),
}

const presentationCaveats: readonly PresentationCaveatViewModel[] = [
  {
    kind: 'full-system-balance-not-computed',
    title: 'Full system balance not computed',
    message: 'Full system balance is not computed.',
    severity: 'warning',
  },
  {
    kind: 'refinery-data-not-included',
    title: 'Refinery data not included',
    message: 'Refinery data is not included.',
    severity: 'warning',
  },
  {
    kind: 'supply-data-not-included',
    title: 'Supply data not included',
    message: 'Supply data is not included.',
    severity: 'warning',
  },
]

export const oilLintPresentationViewModel: SummaryViewModel = {
  reportWeekText,
  geographyText,
  headline: 'Walking-skeleton summary ready for presentation',
  summary: 'Inventory and price output are rendered from the presentation contract, with caveats kept visible.',
  conditionLabel: oilLintPresentationDisplayLabels.pendingCondition,
  confidenceLabel: oilLintPresentationDisplayLabels.pendingConfidence,
  cards: [inventoryCard, priceCard],
  caveats: presentationCaveats,
  displayState: 'partial',
  displayStateMessage: some('Walking-skeleton output includes caveats.'),
}