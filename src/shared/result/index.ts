export type SuccessResult<SuccessValue> = {
  readonly ok: true;
  readonly value: SuccessValue;
};

export type FailureResult<FailureValue> = {
  readonly ok: false;
  readonly error: FailureValue;
};

export type Result<SuccessValue, FailureValue> =
  | SuccessResult<SuccessValue>
  | FailureResult<FailureValue>;