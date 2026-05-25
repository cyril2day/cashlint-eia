import type { EiaClient } from '@/application/ports/eia-client'

export type LiveWeeklyDependencies = Readonly<{
  readonly eiaClient: EiaClient
}>

export const createLiveWeeklyDependencies = (
  dependencies: LiveWeeklyDependencies,
): LiveWeeklyDependencies => dependencies