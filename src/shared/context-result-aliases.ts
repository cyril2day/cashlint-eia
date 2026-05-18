import type { AsyncResult } from '@/shared/async-result'
import type { Result } from '@/shared/result'

export type BoundaryResult<SuccessValue, FailureValue> = Result<SuccessValue, FailureValue>
export type BoundaryAsyncResult<SuccessValue, FailureValue> = AsyncResult<SuccessValue, FailureValue>

export type MeasurementResult<SuccessValue, FailureValue> = Result<SuccessValue, FailureValue>
export type MeasurementAsyncResult<SuccessValue, FailureValue> = AsyncResult<SuccessValue, FailureValue>

export type SystemBalanceResult<SuccessValue, FailureValue> = Result<SuccessValue, FailureValue>
export type SystemBalanceAsyncResult<SuccessValue, FailureValue> = AsyncResult<SuccessValue, FailureValue>

export type InterpretationResult<SuccessValue, FailureValue> = Result<SuccessValue, FailureValue>
export type InterpretationAsyncResult<SuccessValue, FailureValue> = AsyncResult<SuccessValue, FailureValue>

export type AnalysisResult<SuccessValue, FailureValue> = Result<SuccessValue, FailureValue>
export type AnalysisAsyncResult<SuccessValue, FailureValue> = AsyncResult<SuccessValue, FailureValue>

export type PresentationResult<SuccessValue, FailureValue> = Result<SuccessValue, FailureValue>
export type PresentationAsyncResult<SuccessValue, FailureValue> = AsyncResult<SuccessValue, FailureValue>
