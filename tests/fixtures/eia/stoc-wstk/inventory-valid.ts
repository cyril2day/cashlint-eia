import { some } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'

export const inventoryValidEnvelope: RawEiaEnvelope = {
  api: some('2.1.12'),
  request: some({
    command: '/v2/petroleum/stoc/wstk/data/',
    params: {
      frequency: 'weekly',
      data: ['value'],
      facets: {
        series: ['WCRSTUS1'],
        duoarea: ['NUS'],
      },
      start: '2026-01-01',
    },
  }),
  response: some({
    total: '2',
    dateFormat: 'YYYY-MM-DD',
    frequency: 'weekly',
    data: [],
  }),
  data: some([
    {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('836125'),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: some('WCRSTUS1'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('U.S. Ending Stocks of Crude Oil (Thousand Barrels)'),
      notes: some('sanitized fixture'),
    },
    {
      period: some('2026-01-02'),
      date: some('2026-01-02'),
      value: some('838500'),
      unit: some('MBBL'),
      series_id: some('WCRSTUS1'),
      series: some('WCRSTUS1'),
      product: some('CrudeOil'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('U.S. Ending Stocks of Crude Oil (Thousand Barrels)'),
      notes: some('sanitized fixture'),
    },
  ]),
  endpoint: some('/v2/petroleum/stoc/wstk/data/'),
  received_at: some('2026-05-20T00:00:00.000Z'),
}
