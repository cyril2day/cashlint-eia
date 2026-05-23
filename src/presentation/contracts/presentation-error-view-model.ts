import type { Maybe } from '@/shared/maybe'

export type PresentationErrorViewModel = Readonly<{
  readonly title: string
  readonly message: string
  readonly correlationId: Maybe<string>
  readonly retryHint: Maybe<string>
}>