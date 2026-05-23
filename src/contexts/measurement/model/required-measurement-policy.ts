export type RequiredMeasurementPolicyName = 'WalkingSkeleton' | 'FullFirstRelease'

export type RequiredMeasurementPolicy = Readonly<{
  readonly name: RequiredMeasurementPolicyName
  readonly requireInventory: boolean
  readonly requirePrice: boolean
  readonly requireRefinery: boolean
  readonly requireSupply: boolean
}>

export const walkingSkeletonRequiredMeasurementPolicy: RequiredMeasurementPolicy = {
  name: 'WalkingSkeleton',
  requireInventory: true,
  requirePrice: true,
  requireRefinery: false,
  requireSupply: false,
}

export const fullFirstReleaseRequiredMeasurementPolicy: RequiredMeasurementPolicy = {
  name: 'FullFirstRelease',
  requireInventory: true,
  requirePrice: true,
  requireRefinery: true,
  requireSupply: true,
}
