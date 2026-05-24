import type { WalkingSkeletonCommand } from '@/application/commands/walking-skeleton-command'
import type { AsyncResult } from '@/shared/async-result'
import { bindAsyncResult, mapAsyncError } from '@/shared/async-result'
import { bindResult, failure, mapError, mapResult, success } from '@/shared/result'
import { translateInventoryEnvelope, translatePriceEnvelope } from '@/contexts/acl/eia-ingestion-acl'
import { validateBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/gates/trusted-boundary-input'
import processTrustedBoundaryMeasurements from '@/contexts/measurement/workflows/measurement-input-workflow'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { compareReportWeeks } from '@/contexts/measurement/model/report-week'
import type { ApplicationError } from '@/application/errors'
import { toUpstreamAppError, toBoundaryAppError, toBoundaryArrayAppError, toMeasurementAppError } from '@/application/errors'
import { buildWalkingSkeletonRequests } from '@/application/workflows/walking-skeleton-request-descriptions'
import type { WalkingSkeletonDependencies } from '@/application/dependencies/walking-skeleton-dependencies'
import type { BoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import type { Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'

const translateInventoryRows = (envelope: Parameters<typeof translateInventoryEnvelope>[0]): Result<readonly BoundaryDto[], ApplicationError> =>
  mapError(translateInventoryEnvelope(envelope), toBoundaryAppError)

const translatePriceRows = (envelope: Parameters<typeof translatePriceEnvelope>[0]): Result<readonly BoundaryDto[], ApplicationError> =>
  mapError(translatePriceEnvelope(envelope), toBoundaryAppError)

const combineBoundaryDtos = (
  inventoryDtos: readonly BoundaryDto[],
  priceDtos: readonly BoundaryDto[],
): readonly BoundaryDto[] => [...inventoryDtos, ...priceDtos]

const validateTrustedBoundaryInput = (
  input: readonly BoundaryDto[],
): Result<Parameters<typeof processTrustedBoundaryMeasurements>[0], ApplicationError> =>
  mapError(validateBoundaryInput(input), toBoundaryArrayAppError)

const processMeasurements = (
  input: Parameters<typeof processTrustedBoundaryMeasurements>[0],
): Result<readonly WeeklyPetroleumFacts[], ApplicationError> =>
  mapError(processTrustedBoundaryMeasurements(input), toMeasurementAppError)

const byReportWeekDesc = (
  left: WeeklyPetroleumFacts,
  right: WeeklyPetroleumFacts,
): number => compareReportWeeks(right.reportWeek, left.reportWeek)

const sortFactsByLatestReportWeek = (
  facts: readonly WeeklyPetroleumFacts[],
): readonly WeeklyPetroleumFacts[] => [...facts].sort(byReportWeekDesc)

const selectLatestFacts = (facts: readonly WeeklyPetroleumFacts[]): Result<WeeklyPetroleumFacts, ApplicationError> => {
  const latestFacts = facts[0]

  return ifElse(
    (candidate: WeeklyPetroleumFacts | undefined): candidate is undefined => candidate === undefined,
    () => failure(toMeasurementAppError({ kind: 'NoWeeklyFacts', input: 'empty-fact-series' })),
    (candidate: WeeklyPetroleumFacts) => success(candidate),
  )(latestFacts)
}

export const buildWalkingSkeletonFactSeries = (deps: WalkingSkeletonDependencies) => (
  command: WalkingSkeletonCommand,
): AsyncResult<readonly WeeklyPetroleumFacts[], ApplicationError> => {
  const { inventoryRequest, priceRequest } = buildWalkingSkeletonRequests(command)

  const loadInventory = mapAsyncError(deps.eiaClient.loadRows(inventoryRequest), toUpstreamAppError)
  const withInventoryTranslated = bindAsyncResult(loadInventory, inventoryEnvelope =>
    Promise.resolve(translateInventoryRows(inventoryEnvelope)),
  )

  return bindAsyncResult(withInventoryTranslated, inventoryDtos => {
    const loadPrice = mapAsyncError(deps.eiaClient.loadRows(priceRequest), toUpstreamAppError)

    return bindAsyncResult(loadPrice, priceEnvelope => {
      const withPriceTranslated = translatePriceRows(priceEnvelope)
      const combinedBoundaryDtos = mapResult(withPriceTranslated, priceDtos =>
        combineBoundaryDtos(inventoryDtos, priceDtos),
      )
      const trustedInput = bindResult(combinedBoundaryDtos, validateTrustedBoundaryInput)
      const processedFacts = bindResult(trustedInput, processMeasurements)
      return Promise.resolve(mapResult(processedFacts, sortFactsByLatestReportWeek))
    })
  })
}

export const buildWalkingSkeleton = (deps: WalkingSkeletonDependencies) => (
  command: WalkingSkeletonCommand,
): AsyncResult<WeeklyPetroleumFacts, ApplicationError> =>
  bindAsyncResult(
    buildWalkingSkeletonFactSeries(deps)(command),
    facts => Promise.resolve(selectLatestFacts(facts)),
  )
