import type { Maybe } from '@/shared/maybe'

export type AppRouteId = 'home' | 'inventory' | 'price' | 'balance' | 'analysis' | 'charts'

export type AppNavigationItemViewModel = Readonly<{
  readonly routeId: AppRouteId
  readonly label: string
  readonly href: string
  readonly isActive: boolean
  readonly description: Maybe<string>
}>

export type AppNavigationViewModel = Readonly<{
  readonly items: readonly AppNavigationItemViewModel[]
}>
