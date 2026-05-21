import type { EiaClient, EiaRequest, UpstreamError } from '@/application/ports/eia-client'
import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import { bindAsyncResult, mapAsyncError } from '@/shared/async-result'
import { bindResult, mapError, mapResult } from '@/shared/result'
import { none } from '@/shared/maybe'
import { translateInventoryEnvelope, translatePriceEnvelope, type BoundaryError } from '@/contexts/acl/eia-ingestion-acl'
import { validateBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/gates/trusted-boundary-input'
import { walkingSkeletonInventoryEndpoint, walkingSkeletonPriceEndpoint } from '@/contexts/acl/eia-ingestion-acl/policies'
import processTrustedBoundaryMeasurements from '@/contexts/measurement/workflows/measurement-input-workflow'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'

export type WalkingSkeletonDependencies = Readonly<{ readonly eiaClient: EiaClient }>

export type ApplicationError =
  | Readonly<{ readonly kind: 'UpstreamFailure'; readonly error: UpstreamError }>
  | Readonly<{ readonly kind: 'BoundaryFailure'; readonly error: readonly BoundaryError[] }>
  | Readonly<{ readonly kind: 'MeasurementFailure'; readonly error: unknown }>

const buildRequest = (endpoint: string): EiaRequest => ({ endpoint, params: none() })

const toUpstreamAppError = (e: UpstreamError): ApplicationError => ({ kind: 'UpstreamFailure', error: e })
const toBoundaryAppError = (e: BoundaryError): ApplicationError => ({ kind: 'BoundaryFailure', error: [e] })
const toBoundaryArrayAppError = (errs: readonly BoundaryError[]): ApplicationError => ({ kind: 'BoundaryFailure', error: errs })
const toMeasurementAppError = (e: unknown): ApplicationError => ({ kind: 'MeasurementFailure', error: e })

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