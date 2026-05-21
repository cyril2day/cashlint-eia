import { bindResult } from '@/shared/result'
import type { Result } from '@/shared/result'

/**
 * Binder function to use with `pipeWith` for Result-based translator steps.
 * Example: `pipeWith(binder, [stepA, stepB, stepC])`
 */
export const binder = <InputValue, FailureValue, OutputValue>(
  step: (value: InputValue) => Result<OutputValue, FailureValue>,
  result: Result<InputValue, FailureValue>,
): Result<OutputValue, FailureValue> => bindResult(result, step)


