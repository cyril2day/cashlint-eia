import { brand } from '@/shared/domain'
import type { Decimal } from '@/shared/decimal'
import type { ComparisonWindow } from '@/contexts/measurement/model/comparison-window'
import type { TrendDirection } from '@/contexts/measurement/model/trend-direction'

const trendBrand = Symbol('Trend')

export type Trend = Readonly<{
  readonly comparisonWindow: ComparisonWindow
  readonly direction: TrendDirection
  readonly magnitude: Decimal
  readonly [trendBrand]: true
}>

export const createTrend = (
  comparisonWindow: ComparisonWindow,
  direction: TrendDirection,
  magnitude: Decimal,
): Trend => ({
  comparisonWindow,
  direction,
  magnitude,
  [trendBrand]: true,
  ...brand(trendBrand),
})
