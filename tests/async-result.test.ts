import { describe, expect, it } from 'vitest'

import { failure, success } from '@/shared/result'
import type { AsyncResult } from '@/shared/async-result'
import type { Result } from '@/shared/result'

describe('AsyncResult', () => {
  it('resolves to a Result for success values', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(success(42))

    const resolved: Result<number, string> = await asyncResult

    expect(resolved).toEqual({
      ok: true,
      value: 42,
    })
  })

  it('resolves to a Result for failure values', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(failure('missing data'))

    const resolved: Result<number, string> = await asyncResult

    expect(resolved).toEqual({
      ok: false,
      error: 'missing data',
    })
  })
})