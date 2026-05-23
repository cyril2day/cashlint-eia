import { describe, it, expect } from 'vitest'
import { normalizeWeeklyFacts } from '@/contexts/measurement/normalizers/normalizeWeeklyFacts'
import { some } from '@/shared/maybe'
import type { InventoryBoundaryDto, PriceBoundaryDto, RefineryBoundaryDto, SupplyBoundaryDto } from '@/contexts/acl/eia-ingestion-acl/contracts/boundary-dtos'
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

  it('groups full first-release dtos by report week', () => {
    const inventory: InventoryBoundaryDto = {
      kind: 'Inventory',
      periodCandidate: some('2026-01-09'),
      seriesId: some('WCRSTUS1'),
      valueCandidate: some('836125'),
      unitCandidate: some('MBBL'),
      source: { endpoint: '/v2/petroleum/stoc/wstk/data/' },
    }
    const refinery: RefineryBoundaryDto = {
      kind: 'Refinery',
      periodCandidate: some('2026-01-09'),
      seriesId: some('WCRRIUS2'),
      measureKindCandidate: some('RefineryNetInput'),
      valueCandidate: some('16000'),
      unitCandidate: some('MBBL/D'),
      geographyCandidate: some('USTotal'),
      source: { endpoint: '/v2/petroleum/pnp/wiup/data/' },
    }
    const supply: SupplyBoundaryDto = {
      kind: 'Supply',
      periodCandidate: some('2026-01-09'),
      seriesId: some('WCRFPUS2'),
      measureKindCandidate: some('DomesticProduction'),
      valueCandidate: some('13000'),
      unitCandidate: some('MBBL/D'),
      geographyCandidate: some('USTotal'),
      source: { endpoint: '/v2/petroleum/sum/sndw/data/' },
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

    const r = normalizeWeeklyFacts({ inputs: [inventory, refinery, supply, price] })

    const mapped = mapResult(r, v => [v.length, v[0].inventories.length, v[0].refinery.length, v[0].supply.length, v[0].prices.length])

    expect(mapped).toEqual(success([1, 1, 1, 1, 1]))
  })
})
