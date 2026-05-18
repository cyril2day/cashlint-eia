import type { Result } from '@/shared/result'
import { mapResult } from '@/shared/result'
import { failure } from '@/shared/result'
import { ifElse } from '@/shared/fp'

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
			(candidate: Result<SuccessValue, FailureValue>): AsyncResult<NextSuccessValue, FailureValue> =>
				Promise.resolve(failure(Reflect.get(candidate, 'error'))),
			(candidate: Result<SuccessValue, FailureValue>): AsyncResult<NextSuccessValue, FailureValue> =>
				Promise.resolve(binder(Reflect.get(candidate, 'value'))),
		)(result),
	)