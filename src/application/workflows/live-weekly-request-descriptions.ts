import type { LiveWeeklyCommand } from '@/application/commands/live-weekly-command'
import {
  buildInventoryRequest,
  buildPriceRequest,
  buildRefineryRequests,
  buildSupplyRequests,
} from '@/application/ports/eia-request-builders'

export type LiveWeeklyRequests = Readonly<{
  readonly inventoryRequest: ReturnType<typeof buildInventoryRequest>
  readonly priceRequest: ReturnType<typeof buildPriceRequest>
  readonly refineryRequests: ReturnType<typeof buildRefineryRequests>
  readonly supplyRequests: ReturnType<typeof buildSupplyRequests>
}>

export const buildLiveWeeklyRequests = (command: LiveWeeklyCommand): LiveWeeklyRequests => ({
  inventoryRequest: buildInventoryRequest(command.reportWeekIso),
  priceRequest: buildPriceRequest(command.reportWeekIso),
  refineryRequests: buildRefineryRequests(command.reportWeekIso),
  supplyRequests: buildSupplyRequests(command.reportWeekIso),
})
