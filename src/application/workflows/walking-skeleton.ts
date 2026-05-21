import type { EiaClient, EiaRequest } from '@/application/ports/eia-client'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import { bindAsyncResult, mapAsyncError } from '@/shared/async-result'
import { bindResult, mapError, mapResult } from '@/shared/result'
import { none } from '@/shared/maybe'
import { translateInventoryEnvelope, translatePriceEnvelope } from '@/contexts/acl/eia-ingestion-acl'
import { validateBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/gates/trusted-boundary-input'
import { walkingSkeletonInventoryEndpoint, walkingSkeletonPriceEndpoint } from '@/contexts/acl/eia-ingestion-acl/policies'
import processTrustedBoundaryMeasurements from '@/contexts/measurement/workflows/measurement-input-workflow'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { ApplicationError } from '@/application/errors'
import { toUpstreamAppError, toBoundaryAppError, toBoundaryArrayAppError, toMeasurementAppError } from '@/application/errors'

export type WalkingSkeletonDependencies = Readonly<{ readonly eiaClient: EiaClient }>

const buildRequest = (endpoint: string): EiaRequest => ({ endpoint, params: none() })

export const buildWalkingSkeleton = (deps: WalkingSkeletonDependencies) => (
  _cmd: WalkingSkeletonCommand,
): import('@/shared/async-result').AsyncResult<WeeklyPetroleumFacts, ApplicationError> => {
  const inventoryRequest = buildRequest(walkingSkeletonInventoryEndpoint)
  const priceRequest = buildRequest(walkingSkeletonPriceEndpoint)

  const loadInventory = mapAsyncError(deps.eiaClient.loadRows(inventoryRequest), toUpstreamAppError)

  const inventoryTranslated = bindAsyncResult(loadInventory, (invEnvelope) =>
    // translate inventory envelope, map boundary error to ApplicationError
    Promise.resolve(mapError(translateInventoryEnvelope(invEnvelope), toBoundaryAppError)),
  )

  const withPrice = bindAsyncResult(inventoryTranslated, (invDtos) => {
    const loadPrice = mapAsyncError(deps.eiaClient.loadRows(priceRequest), toUpstreamAppError)

    return bindAsyncResult(loadPrice, (priceEnvelope) => {
      const priceTranslated = mapError(translatePriceEnvelope(priceEnvelope), toBoundaryAppError)

      // combine inventory and price dtos
      const combinedDtosResult = mapResult(priceTranslated, (priceDtos) => [...invDtos, ...priceDtos])

      // Actually run the validation and measurement assembly using Result helpers
      const validatedInputResult = bindResult(combinedDtosResult, (inputs) => mapError(validateBoundaryInput(inputs), toBoundaryArrayAppError))

      const processed = bindResult(validatedInputResult, (validInput) => mapError(processTrustedBoundaryMeasurements(validInput), toMeasurementAppError))

      const finalResult = mapResult(processed, (arr) => arr[0])

      return Promise.resolve(finalResult)
    })
  })

  return withPrice
}