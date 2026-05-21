import type { EiaClient } from '@/application/ports/eia-client'

export type WalkingSkeletonDependencies = Readonly<{
  readonly eiaClient: EiaClient
}>

export const createWalkingSkeletonDependencies = (
  dependencies: WalkingSkeletonDependencies,
): WalkingSkeletonDependencies => dependencies