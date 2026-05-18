import { describe, expect, it } from 'vitest'

import { bindAsyncResult, mapAsyncResult } from '@/shared/async-result'
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

  it('maps successful async results', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(success(21))

    const mapped = await mapAsyncResult(asyncResult, value => value * 2)

    expect(mapped).toEqual({
      ok: true,
      value: 42,
    })
  })

  it('leaves failed async results unchanged', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(failure('missing data'))
    let calls = 0

    const mapped = await mapAsyncResult(asyncResult, value => {
      calls += 1

      return value * 2
    })

    expect(calls).toBe(0)
    expect(mapped).toEqual({
      ok: false,
      error: 'missing data',
    })
  })

  it('binds async successful results into another async result', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(success(21))

    const bound = await bindAsyncResult(asyncResult, async value => success(value * 2))

    expect(bound).toEqual({
      ok: true,
      value: 42,
    })
  })

  it('skips binding after async failure', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(failure('missing data'))
    let calls = 0

    const bound = await bindAsyncResult(asyncResult, async value => {
      calls += 1

      return success(value * 2)
    })

    expect(calls).toBe(0)
    expect(bound).toEqual({
      ok: false,
      error: 'missing data',
    })
  })

  it('binds async results into pure Result workflows', async () => {
    const asyncResult: AsyncResult<number, string> = Promise.resolve(success(21))

    const bound = await bindAsyncResult(asyncResult, value => success(value * 2))

    expect(bound).toEqual({
      ok: true,
      value: 42,
    })
  })
})