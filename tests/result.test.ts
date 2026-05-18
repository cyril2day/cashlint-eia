import { describe, expect, it } from 'vitest'

import { failure, isFailure, isSuccess, mapResult, success } from '@/shared/result'
import type { Result } from '@/shared/result'

describe('Result', () => {
  it('represents success values', () => {
    const result = success(42)

    expect(result).toEqual({
      ok: true,
      value: 42,
    })
    expect(result.ok).toBe(true)
  })

  it('represents failure values', () => {
    const result = failure('missing data')

    expect(result).toEqual({
      ok: false,
      error: 'missing data',
    })
    expect(result.ok).toBe(false)
  })

  it('supports array errors', () => {
    const result = failure(['first problem', 'second problem'])

    expect(result).toEqual({
      ok: false,
      error: ['first problem', 'second problem'],
    })
    expect(result.ok).toBe(false)
  })

  it('preserves the supplied success value', () => {
    const value = { label: 'live data' }

    const result = success(value)

    expect(result).toEqual({
      ok: true,
      value,
    })
  })

  it('preserves the supplied failure value', () => {
    const error = ['one', 'two']

    const result = failure(error)

    expect(result).toEqual({
      ok: false,
      error,
    })
  })

  it('identifies successful results', () => {
    const result = success(42)

    expect(isSuccess(result)).toBe(true)
    expect(isFailure(result)).toBe(false)
  })

  it('identifies failed results', () => {
    const result = failure('missing data')

    expect(isSuccess(result)).toBe(false)
    expect(isFailure(result)).toBe(true)
  })

  it('maps successful results', () => {
    const result = success(21)

    const mapped = mapResult(result, value => value * 2)

    expect(mapped).toEqual({
      ok: true,
      value: 42,
    })
    expect(result).toEqual({
      ok: true,
      value: 21,
    })
  })

  it('leaves failed results unchanged', () => {
    const result: Result<number, string> = failure('missing data')
    let calls = 0
    const mapper = (value: number) => {
      calls += 1

      return value * 2
    }

    const mapped = mapResult(result, mapper)

    expect(calls).toBe(0)
    expect(mapped).toEqual(result)
    expect(mapped).toEqual({
      ok: false,
      error: 'missing data',
    })
  })
})