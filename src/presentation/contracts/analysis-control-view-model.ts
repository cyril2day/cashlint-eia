import type { Maybe } from '@/shared/maybe'

export type AnalysisControlViewModel = Readonly<{
  readonly reportWeekLabel: string
  readonly geographyLabel: string
  readonly comparisonWindowLabel: string
  readonly submitLabel: string
  readonly helperText: Maybe<string>
  readonly fieldsDisabled: boolean
}>
