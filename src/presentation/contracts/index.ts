export * from '@/presentation/contracts/summary-card-view-model'
export * from '@/presentation/contracts/presentation-caveat-view-model'
export * from '@/presentation/contracts/presentation-error-view-model'
export * from '@/presentation/contracts/summary-view-model'
export * from '@/presentation/contracts/presentation-display-state'
export * from '@/presentation/contracts/app-navigation-view-model'
export * from '@/presentation/contracts/analysis-control-view-model'
export * from '@/presentation/contracts/caveat-panel-view-model'
export * from '@/presentation/contracts/analysis-trace-view-model'
export * from '@/presentation/contracts/detail-row-view-model'
export * from '@/presentation/contracts/chart-panel-view-model'
export * from '@/presentation/contracts/detail-page-view-model'
export * from '@/presentation/contracts/inventory-detail-view-model'
export * from '@/presentation/contracts/price-detail-view-model'
export * from '@/presentation/contracts/balance-detail-view-model'
export * from '@/presentation/contracts/analysis-detail-view-model'
export * from '@/presentation/contracts/charts-gallery-view-model'
export * from '@/presentation/contracts/home-page-view-model'

export const oilLintPresentationBemRules: readonly string[] = [
  'Use one meaningful block name per presentation surface.',
  'Scope elements to the owning block with a double underscore.',
  'Use modifiers only for display variation, not domain logic.',
]
