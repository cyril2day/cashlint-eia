import type { Maybe } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from './presentation-caveat-view-model'

export type DetailRowViewModel = Readonly<{
  readonly label: string
  readonly value: string
  readonly unit: Maybe<string>
  readonly status: Maybe<string>
  readonly description: Maybe<string>
  readonly caveats: Maybe<readonly PresentationCaveatViewModel[]>
}>
