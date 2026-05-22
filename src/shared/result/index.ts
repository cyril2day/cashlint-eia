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
    isFailure<SuccessValue, FailureValue>,
    (failureResult: FailureResult<FailureValue>) => failure(failureResult.error),
    (successResult: SuccessResult<SuccessValue>) => success(mapper(successResult.value)),
  )(result)

export const bindResult = <SuccessValue, FailureValue, NextSuccessValue>(
  result: Result<SuccessValue, FailureValue>,
  binder: (value: SuccessValue) => Result<NextSuccessValue, FailureValue>,
): Result<NextSuccessValue, FailureValue> =>
  ifElse(
    isFailure<SuccessValue, FailureValue>,
    (failureResult: FailureResult<FailureValue>) => failure(failureResult.error),
    (successResult: SuccessResult<SuccessValue>) => binder(successResult.value),
  )(result)

export const combineResults = <FirstValue, FailureValue, SecondValue, CombinedValue>(
  first: Result<FirstValue, FailureValue>,
  second: Result<SecondValue, FailureValue>,
  combiner: (firstValue: FirstValue, secondValue: SecondValue) => CombinedValue,
): Result<CombinedValue, FailureValue> =>
  bindResult(first, firstValue => mapResult(second, secondValue => combiner(firstValue, secondValue)))

export const mapError = <SuccessValue, FailureValue, NextFailureValue>(
  result: Result<SuccessValue, FailureValue>,
  mapper: (error: FailureValue) => NextFailureValue,
): Result<SuccessValue, NextFailureValue> =>
  ifElse(
    isFailure<SuccessValue, FailureValue>,
    (failureResult: FailureResult<FailureValue>) => failure(mapper(failureResult.error)),
    (successResult: SuccessResult<SuccessValue>) => success(successResult.value),
  )(result)

export const sequenceResults = <SuccessValue, FailureValue>(
  results: readonly Result<SuccessValue, FailureValue>[],
): Result<readonly SuccessValue[], FailureValue> =>
  results.reduce<Result<readonly SuccessValue[], FailureValue>>(
    (accumulator, candidate) =>
      bindResult(accumulator, values => mapResult(candidate, value => [...values, value])),
    success<readonly SuccessValue[]>([]),
  )

export const traverseResults = <InputValue, FailureValue, SuccessValue>(
  values: readonly InputValue[],
  mapper: (value: InputValue) => Result<SuccessValue, FailureValue>,
): Result<readonly SuccessValue[], FailureValue> => sequenceResults(values.map(mapper))