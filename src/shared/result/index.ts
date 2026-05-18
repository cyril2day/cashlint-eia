import { ifElse } from '@/shared/fp'

export type SuccessResult<SuccessValue> = {
  readonly ok: true
  readonly value: SuccessValue
}

export type FailureResult<FailureValue> = {
  readonly ok: false
  readonly error: FailureValue
}

export type Result<SuccessValue, FailureValue> =
  | SuccessResult<SuccessValue>
  | FailureResult<FailureValue>

export const success = <SuccessValue>(value: SuccessValue): SuccessResult<SuccessValue> => ({
  ok: true,
  value,
})

export const failure = <FailureValue>(error: FailureValue): FailureResult<FailureValue> => ({
  ok: false,
  error,
})

export const isSuccess = <SuccessValue, FailureValue>(
  result: Result<SuccessValue, FailureValue>,
): result is SuccessResult<SuccessValue> => result.ok === true

export const isFailure = <SuccessValue, FailureValue>(
  result: Result<SuccessValue, FailureValue>,
): result is FailureResult<FailureValue> => result.ok === false

export const mapResult = <SuccessValue, FailureValue, NextSuccessValue>(
  result: Result<SuccessValue, FailureValue>,
  mapper: (value: SuccessValue) => NextSuccessValue,
): Result<NextSuccessValue, FailureValue> =>
  ifElse(
    (candidate: Result<SuccessValue, FailureValue>) => candidate.ok === false,
    (candidate: Result<SuccessValue, FailureValue>): Result<NextSuccessValue, FailureValue> =>
      failure(Reflect.get(candidate, 'error')),
    (candidate: Result<SuccessValue, FailureValue>): Result<NextSuccessValue, FailureValue> =>
      success(mapper(Reflect.get(candidate, 'value'))),
  )(result)