import { describe, it, expect } from 'vitest'
import { isSome } from '@/shared/maybe'
import { buildInventoryRequest, buildPriceRequest } from '@/application/ports/eia-request-builders'

describe('EIA request builders', () => {
  it('builds inventory request with correct endpoint and params', () => {
    const week = '2026-01-01'
    const req = buildInventoryRequest(week)

    expect(String(req.endpoint)).toContain('stoc')
    expect(isSome(req.params)).toBe(true)
  })

  it('builds price request with correct endpoint and params', () => {
    const week = '2026-01-01'
    const req = buildPriceRequest(week)

    expect(String(req.endpoint)).toContain('pri')
    expect(isSome(req.params)).toBe(true)
  })
})
