import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import { buildInventoryRequest, buildPriceRequest } from '@/application/ports/eia-request-builders'

export type WalkingSkeletonRequests = Readonly<{
  readonly inventoryRequest: ReturnType<typeof buildInventoryRequest>
  readonly priceRequest: ReturnType<typeof buildPriceRequest>
}>

export const buildWalkingSkeletonRequests = (command: WalkingSkeletonCommand): WalkingSkeletonRequests => ({
  inventoryRequest: buildInventoryRequest(command.reportWeekIso),
  priceRequest: buildPriceRequest(command.reportWeekIso),
})
