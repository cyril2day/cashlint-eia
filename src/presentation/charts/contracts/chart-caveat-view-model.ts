export type ChartCaveatViewModel = Readonly<{
  readonly kind: string
  readonly title: string
  readonly message: string
  readonly severity: 'info' | 'warning' | 'critical'
}>
