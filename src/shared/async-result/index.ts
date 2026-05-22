import { ifElse } from '@/shared/fp'
import { failure, mapError, mapResult } from '@/shared/result'
import type { FailureResult, Result, SuccessResult } from '@/shared/result'

export type AsyncResult<SuccessValue, FailureValue> = Promise<Result<SuccessValue, FailureValue>>

export const mapAsyncResult = <SuccessValue, FailureValue, NextSuccessValue>(
  asyncResult: AsyncResult<SuccessValue, FailureValue>,
  mapper: (value: SuccessValue) => NextSuccessValue,
): AsyncResult<NextSuccessValue, FailureValue> =>
  asyncResult.then(result => mapResult(result, mapper))

export const bindAsyncResult = <SuccessValue, FailureValue, NextSuccessValue>(
  asyncResult: AsyncResult<SuccessValue, FailureValue>,
  binder: (value: SuccessValue) => Result<NextSuccessValue, FailureValue> | AsyncResult<NextSuccessValue, FailureValue>,
): AsyncResult<NextSuccessValue, FailureValue> =>
  asyncResult.then(result =>
    ifElse(
      (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === false,
      (candidate: FailureResult<FailureValue>): AsyncResult<NextSuccessValue, FailureValue> =>
        Promise.resolve(failure(candidate.error)),
      (candidate: SuccessResult<SuccessValue>): AsyncResult<NextSuccessValue, FailureValue> =>
        Promise.resolve(binder(candidate.value)),
    )(result),
  )

export const mapAsyncError = <SuccessValue, FailureValue, NextFailureValue>(
  asyncResult: AsyncResult<SuccessValue, FailureValue>,
  mapper: (error: FailureValue) => NextFailureValue,
): AsyncResult<SuccessValue, NextFailureValue> =>
  asyncResult.then(result => mapError(result, mapper))
