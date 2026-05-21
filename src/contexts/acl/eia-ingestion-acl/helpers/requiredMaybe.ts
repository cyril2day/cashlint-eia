import { isNone } from '@/shared/maybe'
import { ifElse } from '@/shared/fp'
import { success, failure, traverseResults, mapResult } from '@/shared/result'
import type { Maybe } from '@/shared/maybe'
import type { Result } from '@/shared/result'
import type { BoundaryError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'
import { makeMissingRequiredFieldError } from '@/contexts/acl/eia-ingestion-acl/errors/boundary-error'

type BoundaryErrorArray = readonly BoundaryError[]

export type RequiredMaybeField = Readonly<{
  readonly fieldName: string
  readonly value: Maybe<unknown>
}>

export const validateRequiredMaybeField = <Candidate, Value>(
  candidate: Candidate,
  value: Maybe<Value>,
  error: BoundaryError,
): Result<Candidate, BoundaryErrorArray> =>
  ifElse(
    isNone,
    () => failure([error]),
    () => success(candidate),
  )(value)

export const validateRequiredMaybeFields = <Candidate>(
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


