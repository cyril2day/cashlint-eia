import type { Maybe } from '@/shared/maybe'

export type SummaryCardKind = 'inventory' | 'price' | 'availableSupply' | 'refineryDemand' | 'system'

export type SummaryCardViewModel = Readonly<{
  readonly kind: SummaryCardKind
  readonly title: string
  readonly valueText: string
  readonly statusLabel: string
  readonly subtitleText: Maybe<string>
  readonly trendLabel: Maybe<string>
  readonly anomalyLabel: Maybe<string>
  readonly caveatLabel: Maybe<string>
  readonly drilldownTarget: Maybe<string>
}>
