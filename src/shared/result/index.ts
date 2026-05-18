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