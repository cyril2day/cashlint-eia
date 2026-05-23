import type { BoundaryDto, TrustedBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapResult, traverseResults } from '@/shared/result'
import type { Result } from '@/shared/result'
import { cond, ifElse } from '@/shared/fp'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import { validateRequiredMaybeFields, RequiredMaybeField } from '@/contexts/acl/eia-ingestion-acl/helpers/requiredMaybe'
import { getKey } from '@/shared/object'
import { none, type Maybe } from '@/shared/maybe'

type BoundaryErrorArray = readonly BoundaryError[]

const isMaybeInput = (candidate: unknown): candidate is Maybe<unknown> =>
  cond([
    [(value: unknown) => getKey('kind')(value) === 'Some', () => true],
    [(value: unknown) => getKey('kind')(value) === 'None', () => true],
    [() => true, () => false],
  ])(candidate)

const readMaybeField = (fieldName: string) => (candidate: BoundaryDto): Maybe<unknown> =>
  ifElse(
    isMaybeInput,
    (value: Maybe<unknown>) => value,
    () => none(),
  )(getKey(fieldName)(candidate))

const validateInventory = (candidate: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> => {
  const fields: readonly RequiredMaybeField[] = [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
  ]

  return validateRequiredMaybeFields(candidate, candidate.source.endpoint, fields)
}

const validatePrice = (candidate: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> => {
  const fields: readonly RequiredMaybeField[] = [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
    { fieldName: 'measureKindCandidate', value: readMaybeField('measureKindCandidate')(candidate) },
  ]

  return validateRequiredMaybeFields(candidate, candidate.source.endpoint, fields)
}

const validateRefinery = (candidate: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> => {
  const fields: readonly RequiredMaybeField[] = [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
    { fieldName: 'measureKindCandidate', value: readMaybeField('measureKindCandidate')(candidate) },
    { fieldName: 'geographyCandidate', value: readMaybeField('geographyCandidate')(candidate) },
  ]

  return validateRequiredMaybeFields(candidate, candidate.source.endpoint, fields)
}

const validateSupply = (candidate: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> => {
  const fields: readonly RequiredMaybeField[] = [
    { fieldName: 'seriesId', value: candidate.seriesId },
    { fieldName: 'value', value: candidate.valueCandidate },
    { fieldName: 'measureKindCandidate', value: readMaybeField('measureKindCandidate')(candidate) },
    { fieldName: 'geographyCandidate', value: readMaybeField('geographyCandidate')(candidate) },
  ]

  return validateRequiredMaybeFields(candidate, candidate.source.endpoint, fields)
}

const validateBoundary = (d: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> =>
  cond<[BoundaryDto], Result<BoundaryDto, BoundaryErrorArray>>([
    [(candidate: BoundaryDto) => candidate.kind === 'Inventory', validateInventory],
    [(candidate: BoundaryDto) => candidate.kind === 'Price', validatePrice],
    [(candidate: BoundaryDto) => candidate.kind === 'Refinery', validateRefinery],
    [() => true, (candidate: BoundaryDto) => validateSupply(candidate)],
  ])(d)

export const validateBoundaryInput = (
  inputs: readonly BoundaryDto[],
): Result<TrustedBoundaryInput, BoundaryErrorArray> =>
  mapResult(
    traverseResults(inputs, validateBoundary),
    (values: readonly BoundaryDto[]) => ({ inputs: values }),
  )
