import type { Maybe } from '@/shared/maybe'

import type { PresentationCaveatViewModel } from '@/presentation/contracts/presentation-caveat-view-model'
import type { PresentationDisplayState } from '@/presentation/contracts/presentation-display-state'

export type CaveatPanelViewModel = Readonly<{
  readonly title: string
  readonly caveats: readonly PresentationCaveatViewModel[]
  readonly state: PresentationDisplayState
  readonly summary: Maybe<string>
}>
