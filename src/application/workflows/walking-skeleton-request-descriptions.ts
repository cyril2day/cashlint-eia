import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import {
  buildInventoryRequest,
  buildPriceRequest,
  buildRefineryRequests,
  buildSupplyRequests,
} from '@/application/ports/eia-request-builders'

export type WalkingSkeletonRequests = Readonly<{
  readonly inventoryRequest: ReturnType<typeof buildInventoryRequest>
  readonly priceRequest: ReturnType<typeof buildPriceRequest>
  readonly refineryRequests: ReturnType<typeof buildRefineryRequests>
  readonly supplyRequests: ReturnType<typeof buildSupplyRequests>
}>

export const buildWalkingSkeletonRequests = (command: WalkingSkeletonCommand): WalkingSkeletonRequests => ({
  inventoryRequest: buildInventoryRequest(command.reportWeekIso),
  priceRequest: buildPriceRequest(command.reportWeekIso),
  refineryRequests: buildRefineryRequests(command.reportWeekIso),
  supplyRequests: buildSupplyRequests(command.reportWeekIso),
})
