import type { Result } from '@/shared/result'

export type AsyncResult<SuccessValue, FailureValue> = Promise<Result<SuccessValue, FailureValue>>