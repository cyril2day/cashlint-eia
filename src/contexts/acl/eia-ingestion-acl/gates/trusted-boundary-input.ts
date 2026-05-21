import type { BoundaryDto, TrustedBoundaryInput, InventoryBoundaryDto, PriceBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapResult, traverseResults } from '@/shared/result'
import type { Result } from '@/shared/result'
import { ifElse } from '@/shared/fp'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import { validateRequiredMaybeFields, RequiredMaybeField } from '@/contexts/acl/eia-ingestion-acl/helpers/requiredMaybe'

type BoundaryErrorArray = readonly BoundaryError[]

const validateInventory = (candidate: InventoryBoundaryDto): Result<InventoryBoundaryDto, BoundaryErrorArray> => {
  const fields: readonly RequiredMaybeField[] = [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
  ]

  return validateRequiredMaybeFields(candidate, candidate.source.endpoint, fields)
}

const validatePrice = (candidate: PriceBoundaryDto): Result<PriceBoundaryDto, BoundaryErrorArray> => {
  const fields: readonly RequiredMaybeField[] = [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
    { fieldName: 'measureKindCandidate', value: candidate.measureKindCandidate },
  ]

  return validateRequiredMaybeFields(candidate, candidate.source.endpoint, fields)
}

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


