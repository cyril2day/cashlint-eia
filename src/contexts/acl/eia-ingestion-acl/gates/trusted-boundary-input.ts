import type { BoundaryDto, TrustedBoundaryInput } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapResult, traverseResults } from '@/shared/result'
import type { Result } from '@/shared/result'
import { cond, ifElse } from '@/shared/fp'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import { validateRequiredMaybeFields, RequiredMaybeField } from '@/contexts/acl/eia-ingestion-acl/helpers/requiredMaybe'
import { getKey } from '@/shared/object'
import { none, type Maybe } from '@/shared/maybe'

type BoundaryErrorArray = readonly BoundaryError[]
type RequiredFieldName = 'seriesId' | 'value' | 'measureKindCandidate' | 'geographyCandidate'
type RequiredFieldReader = (candidate: BoundaryDto) => Maybe<unknown>
type BoundaryMaybeFieldName = 'measureKindCandidate' | 'geographyCandidate'

const isSomeMaybeKind = (kind: unknown): boolean => kind === 'Some'
const isNoneMaybeKind = (kind: unknown): boolean => kind === 'None'

const isMaybeInput = (candidate: unknown): candidate is Maybe<unknown> =>
  cond([
    [(value: unknown) => isSomeMaybeKind(getKey('kind')(value)), () => true],
    [(value: unknown) => isNoneMaybeKind(getKey('kind')(value)), () => true],
    [() => true, () => false],
  ])(candidate)

const readMaybeField = (fieldName: BoundaryMaybeFieldName) => (candidate: BoundaryDto): Maybe<unknown> =>
  ifElse(
    isMaybeInput,
    (value: Maybe<unknown>) => value,
    () => none(),
  )(getKey(fieldName)(candidate))

const requiredFieldReaderByName: Readonly<Record<RequiredFieldName, RequiredFieldReader>> = {
  seriesId: candidate => candidate.seriesId,
  value: candidate => candidate.valueCandidate,
  measureKindCandidate: readMaybeField('measureKindCandidate'),
  geographyCandidate: readMaybeField('geographyCandidate'),
}

const requiredFieldNamesByBoundaryKind: Readonly<Record<BoundaryDto['kind'], readonly RequiredFieldName[]>> = {
  Inventory: ['seriesId', 'value'],
  Price: ['seriesId', 'value', 'measureKindCandidate'],
  Refinery: ['seriesId', 'value', 'measureKindCandidate', 'geographyCandidate'],
  Supply: ['seriesId', 'value', 'measureKindCandidate', 'geographyCandidate'],
}

const toRequiredMaybeField = (candidate: BoundaryDto) => (fieldName: RequiredFieldName): RequiredMaybeField => ({
  fieldName,
  value: requiredFieldReaderByName[fieldName](candidate),
})

const readRequiredMaybeFields = (candidate: BoundaryDto): readonly RequiredMaybeField[] =>
  requiredFieldNamesByBoundaryKind[candidate.kind].map(toRequiredMaybeField(candidate))

const validateBoundary = (candidate: BoundaryDto): Result<BoundaryDto, BoundaryErrorArray> =>
  validateRequiredMaybeFields(candidate, candidate.source.endpoint, readRequiredMaybeFields(candidate))

export const validateBoundaryInput = (
  inputs: readonly BoundaryDto[],
): Result<TrustedBoundaryInput, BoundaryErrorArray> =>
  mapResult(
    traverseResults(inputs, validateBoundary),
    (values: readonly BoundaryDto[]) => ({ inputs: values }),
  )
