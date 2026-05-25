import type { Maybe } from '@/shared/maybe'

export type ProductRouteId = 'home' | 'inventory' | 'price' | 'balance' | 'analysis' | 'charts'

export type ProductNavigationItemViewModel = Readonly<{
  readonly routeId: ProductRouteId
  readonly label: string
  readonly href: string
  readonly isActive: boolean
  readonly description: Maybe<string>
}>

export type ProductNavigationViewModel = Readonly<{
  readonly items: readonly ProductNavigationItemViewModel[]
}>
