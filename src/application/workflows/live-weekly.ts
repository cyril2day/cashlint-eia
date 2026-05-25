import type { LiveWeeklyCommand } from '@/application/commands/live-weekly-command'
import type { AsyncResult } from '@/shared/async-result'
import { bindAsyncResult, mapAsyncError } from '@/shared/async-result'
import { bindResult, failure, mapError, mapResult, sequenceResults, success } from '@/shared/result'
import { translateInventoryEnvelope, translatePriceEnvelope, translateRefineryEnvelope, translateSupplyEnvelope } from '@/contexts/acl/eia-ingestion-acl'
import { validateBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/gates/trusted-boundary-input'
import processTrustedBoundaryMeasurements from '@/contexts/measurement/workflows/measurement-input-workflow'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import { compareReportWeeks } from '@/contexts/measurement/model/report-week'
import { fullFirstReleaseRequiredMeasurementPolicy } from '@/contexts/measurement/model/required-measurement-policy'
import type { ApplicationError } from '@/application/errors'
import { toUpstreamAppError, toBoundaryAppError, toBoundaryArrayAppError, toMeasurementAppError } from '@/application/errors'
import { buildLiveWeeklyRequests } from '@/application/workflows/live-weekly-request-descriptions'
import type { LiveWeeklyDependencies } from '@/application/dependencies/live-weekly-dependencies'
import type { BoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'
import type { EiaRequest } from '@/application/ports/eia-client'
import type { Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'

const translateInventoryRows = (envelope: Parameters<typeof translateInventoryEnvelope>[0]): Result<readonly BoundaryDto[], ApplicationError> =>
  mapError(translateInventoryEnvelope(envelope), toBoundaryAppError)

const translatePriceRows = (envelope: Parameters<typeof translatePriceEnvelope>[0]): Result<readonly BoundaryDto[], ApplicationError> =>
  mapError(translatePriceEnvelope(envelope), toBoundaryAppError)

const translateRefineryRows = (envelope: Parameters<typeof translateRefineryEnvelope>[0]): Result<readonly BoundaryDto[], ApplicationError> =>
  mapError(translateRefineryEnvelope(envelope), toBoundaryAppError)

const translateSupplyRows = (envelope: Parameters<typeof translateSupplyEnvelope>[0]): Result<readonly BoundaryDto[], ApplicationError> =>
  mapError(translateSupplyEnvelope(envelope), toBoundaryAppError)

const flattenBoundaryDtos = (groups: readonly (readonly BoundaryDto[])[]): readonly BoundaryDto[] =>
  groups.flatMap(group => group)

const validateTrustedBoundaryInput = (
  input: readonly BoundaryDto[],
): Result<Parameters<typeof processTrustedBoundaryMeasurements>[0], ApplicationError> =>
  mapError(validateBoundaryInput(input), toBoundaryArrayAppError)

const processMeasurements = (
  input: Parameters<typeof processTrustedBoundaryMeasurements>[0],
): Result<readonly WeeklyPetroleumFacts[], ApplicationError> =>
  mapError(
    processTrustedBoundaryMeasurements(input, fullFirstReleaseRequiredMeasurementPolicy),
    toMeasurementAppError,
  )

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

const loadEnvelope = (
  deps: LiveWeeklyDependencies,
  request: EiaRequest,
): AsyncResult<RawEiaEnvelope, ApplicationError> =>
  mapAsyncError(deps.eiaClient.loadRows(request), toUpstreamAppError)

const loadEnvelopes = (
  deps: LiveWeeklyDependencies,
  requests: readonly EiaRequest[],
): AsyncResult<readonly RawEiaEnvelope[], ApplicationError> =>
  Promise.all(requests.map(request => loadEnvelope(deps, request))).then(sequenceResults)

const translateEnvelopes = (
  envelopes: readonly RawEiaEnvelope[],
  translator: (envelope: RawEiaEnvelope) => Result<readonly BoundaryDto[], ApplicationError>,
): Result<readonly BoundaryDto[], ApplicationError> =>
  mapResult(sequenceResults(envelopes.map(translator)), flattenBoundaryDtos)

export const buildLiveWeeklyFactSeries = (deps: LiveWeeklyDependencies) => (
  command: LiveWeeklyCommand,
): AsyncResult<readonly WeeklyPetroleumFacts[], ApplicationError> => {
  const { inventoryRequest, priceRequest, refineryRequests, supplyRequests } = buildLiveWeeklyRequests(command)
  const requests = [
    inventoryRequest,
    priceRequest,
    ...refineryRequests,
    ...supplyRequests,
  ]

  return bindAsyncResult(loadEnvelopes(deps, requests), ([inventoryEnvelope, priceEnvelope, ...supportingEnvelopes]) => {
    const refineryEnvelopeCount = refineryRequests.length
    const refineryEnvelopes = supportingEnvelopes.slice(0, refineryEnvelopeCount)
    const supplyEnvelopes = supportingEnvelopes.slice(refineryEnvelopeCount)
    const inventoryDtos = translateInventoryRows(inventoryEnvelope)
    const priceDtos = translatePriceRows(priceEnvelope)
    const refineryDtos = translateEnvelopes(refineryEnvelopes, translateRefineryRows)
    const supplyDtos = translateEnvelopes(supplyEnvelopes, translateSupplyRows)
    const combinedBoundaryDtos = mapResult(
      sequenceResults([inventoryDtos, priceDtos, refineryDtos, supplyDtos]),
      flattenBoundaryDtos,
    )
    const trustedInput = bindResult(combinedBoundaryDtos, validateTrustedBoundaryInput)
    const processedFacts = bindResult(trustedInput, processMeasurements)

    return Promise.resolve(mapResult(processedFacts, sortFactsByLatestReportWeek))
  })
}

export const buildLiveWeekly = (deps: LiveWeeklyDependencies) => (
  command: LiveWeeklyCommand,
): AsyncResult<WeeklyPetroleumFacts, ApplicationError> =>
  bindAsyncResult(
    buildLiveWeeklyFactSeries(deps)(command),
    facts => Promise.resolve(selectLatestFacts(facts)),
  )
