import { describe, expect, it } from 'vitest'

import {
  bindResult,
  failure,
  isFailure,
  isSuccess,
  mapError,
  mapResult,
  sequenceResults,
  success,
  traverseResults,
} from '@/shared/result'
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

  it('binds successful results into another result', () => {
    const result = success(21)

    const bound = bindResult(result, value => success(value * 2))

    expect(bound).toEqual({
      ok: true,
      value: 42,
    })
    expect(result).toEqual({
      ok: true,
      value: 21,
    })
  })

  it('skips binding after failure', () => {
    const result: Result<number, string> = failure('missing data')
    let calls = 0

    const bound = bindResult<number, string, number>(result, value => {
      calls += 1

      return success(value * 2)
    })

    expect(calls).toBe(0)
    expect(bound).toEqual(result)
    expect(bound).toEqual({
      ok: false,
      error: 'missing data',
    })
  })

  it('maps failure values', () => {
    const result = failure('missing data')
    let calls = 0

    const mapped = mapError<number, string, string>(result, (error: string) => {
      calls += 1

      return error.toUpperCase()
    })

    expect(calls).toBe(1)
    expect(mapped).toEqual({
      ok: false,
      error: 'MISSING DATA',
    })
    expect(result).toEqual({
      ok: false,
      error: 'missing data',
    })
  })

  it('leaves successful results unchanged when mapping errors', () => {
    const result = success(21)
    let calls = 0

    const errorMapper: (error: string) => string = error => {
      calls += 1

      return error.toUpperCase()
    }

    const mapped = mapError(result, errorMapper)

    expect(calls).toBe(0)
    expect(mapped).toEqual(result)
    expect(mapped).toEqual({
      ok: true,
      value: 21,
    })
  })

  it('sequences all successful results', () => {
    const results: readonly Result<number, string>[] = [success(1), success(2), success(3)]

    const sequenced = sequenceResults(results)

    expect(sequenced).toEqual({
      ok: true,
      value: [1, 2, 3],
    })
    expect(results).toEqual([success(1), success(2), success(3)])
  })

  it('returns the only failure when sequencing one failure', () => {
    const results: readonly Result<number, string>[] = [success(1), failure('missing data'), success(3)]

    const sequenced = sequenceResults(results)

    expect(sequenced).toEqual({
      ok: false,
      error: 'missing data',
    })
    expect(results).toEqual([success(1), failure('missing data'), success(3)])
  })

  it('returns the first failure when sequencing multiple failures', () => {
    const results: readonly Result<number, string>[] = [failure('first problem'), success(2), failure('second problem')]

    const sequenced = sequenceResults(results)

    expect(sequenced).toEqual({
      ok: false,
      error: 'first problem',
    })
    expect(results).toEqual([failure('first problem'), success(2), failure('second problem')])
  })

  it('traverses successful collections', () => {
    const values: readonly number[] = [1, 2, 3]

    const traversed = traverseResults(values, value => success(value * 2))

    expect(traversed).toEqual({
      ok: true,
      value: [2, 4, 6],
    })
    expect(values).toEqual([1, 2, 3])
  })

  it('traverses collections that contain failures', () => {
    const values: readonly [0, 1, 2] = [0, 1, 2]
    const results: readonly [Result<number, string>, Result<number, string>, Result<number, string>] = [
      success(1),
      failure('missing data'),
      success(3),
    ]

    const traversed = traverseResults(values, index => results[index])

    expect(traversed).toEqual({
      ok: false,
      error: 'missing data',
    })
    expect(values).toEqual([0, 1, 2])
    expect(results).toEqual([success(1), failure('missing data'), success(3)])
  })
})