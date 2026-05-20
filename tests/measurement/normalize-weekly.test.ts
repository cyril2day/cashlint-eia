import { describe, it, expect } from 'vitest'
import { normalizeWeeklyFacts } from '@/contexts/measurement/normalizers/normalizeWeeklyFacts'
import { some } from '@/shared/maybe'
import type { InventoryBoundaryDto, PriceBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
import { mapResult, success } from '@/shared/result'

describe('normalizeWeeklyFacts', () => {
  it('groups inventory and price dtos by report week', () => {
    const inventory: InventoryBoundaryDto = {
      kind: 'Inventory',
      periodCandidate: some('2026-01-09'),
      seriesId: some('WCRSTUS1'),
      valueCandidate: some('836125'),
      unitCandidate: some('MBBL'),
      source: { endpoint: '/v2/petroleum/stoc/wstk/data/' },
    }

    const price: PriceBoundaryDto = {
      kind: 'Price',
      periodCandidate: some('2026-01-09'),
      seriesId: some('EPCWTIR'),
      measureKindCandidate: some('WTISpotPrice'),
      valueCandidate: some('76.31'),
      unitCandidate: some('USD/bbl'),
      source: { endpoint: '/v2/petroleum/pri/spt/data/' },
    }

    const r = normalizeWeeklyFacts({ inputs: [inventory, price] })

    // Validate via Result mapping to avoid imperative branching
    const mapped = mapResult(r, v => [v.length, v[0].inventories.length, v[0].prices.length])

    expect(mapped).toEqual(success([1, 1, 1]))
  })
})
