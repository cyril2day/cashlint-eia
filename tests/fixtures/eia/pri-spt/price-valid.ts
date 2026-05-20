import { some } from '@/shared/maybe'
import type { RawEiaEnvelope } from '@/contexts/acl/eia-ingestion-acl/contracts/raw-eia'

export const priceValidEnvelope: RawEiaEnvelope = {
  api: some('2.1.12'),
  request: some({
    command: '/v2/petroleum/pri/spt/data/',
    params: {
      frequency: 'weekly',
      data: ['value'],
      facets: {
        product: ['EPCWTIR'],
      },
      start: '2026-01-01',
    },
  }),
  response: some({
    total: '1',
    dateFormat: 'YYYY-MM-DD',
    frequency: 'weekly',
    data: [],
  }),
  data: some([
    {
      period: some('2026-01-09'),
      date: some('2026-01-09'),
      value: some('76.31'),
      unit: some('USD/bbl'),
      series_id: some('EPCWTIR'),
      series: some('RWTC'),
      product: some('EPCWTIR'),
      geography: some('NUS'),
      frequency: some('weekly'),
      description: some('WTI crude oil spot price'),
      notes: some('sanitized fixture'),
    },
  ]),
  endpoint: some('/v2/petroleum/pri/spt/data/'),
  received_at: some('2026-05-20T00:00:00.000Z'),
}