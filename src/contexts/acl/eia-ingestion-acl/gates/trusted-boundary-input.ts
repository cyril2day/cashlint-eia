import type { BoundaryDto, TrustedBoundaryInput, InventoryBoundaryDto, PriceBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { isNone } from '@/shared/maybe'
import type { Maybe } from '@/shared/maybe'
import { success, failure, traverseResults, mapResult } from '@/shared/result'
import type { Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'
import { makeMissingRequiredFieldError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'

type BoundaryErrorArray = readonly BoundaryError[]

type RequiredMaybeField = Readonly<{
  readonly fieldName: string
  readonly value: Maybe<unknown>
}>

const validateRequiredMaybeField = <Candidate, Value>(
  candidate: Candidate,
  value: Maybe<Value>,
  error: BoundaryError,
): Result<Candidate, BoundaryErrorArray> =>
  ifElse(
    isNone,
    () => failure([error]),
    () => success(candidate),
  )(value)

const validateRequiredMaybeFields = <Candidate>(
  candidate: Candidate,
  endpoint: string,
  fields: readonly RequiredMaybeField[],
): Result<Candidate, BoundaryErrorArray> =>
  mapResult(
    traverseResults(fields, field =>
      validateRequiredMaybeField(candidate, field.value, makeMissingRequiredFieldError(field.fieldName, { endpoint })),
    ),
    () => candidate,
  )

const validateInventory = (candidate: InventoryBoundaryDto): Result<InventoryBoundaryDto, BoundaryErrorArray> =>
  validateRequiredMaybeFields(candidate, candidate.source.endpoint, [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
  ])

const validatePrice = (candidate: PriceBoundaryDto): Result<PriceBoundaryDto, BoundaryErrorArray> =>
  validateRequiredMaybeFields(candidate, candidate.source.endpoint, [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
    { fieldName: 'measureKindCandidate', value: candidate.measureKindCandidate },
  ])

const validateBoundary = (d: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> =>
  ifElse(
    (candidate: BoundaryDto) => candidate.kind === 'Inventory',
    validateInventory,
    validatePrice,
  )(d)

export const validateBoundaryInput = (
  inputs: readonly BoundaryDto[],
): Result<TrustedBoundaryInput, BoundaryErrorArray> =>
  mapResult(
    traverseResults(inputs, validateBoundary),
    (values: readonly BoundaryDto[]) => ({ inputs: values }),
  )

export default {}
