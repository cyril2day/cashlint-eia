import type { EiaRequest } from '@/application/ports/eia-client'
import { some } from '@/shared/maybe'

const latestWeeklyRowParams = {
  frequency: 'weekly',
  'data[]': 'value',
  'sort[0][column]': 'period',
  'sort[0][direction]': 'desc',
  offset: '0',
  length: '2',
}

export const buildInventoryRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/stoc/wstk/data/',
  params: some({
    ...latestWeeklyRowParams,
    start: reportWeekIso,
    'facets[series][]': 'WCRSTUS1',
    'facets[duoarea][]': 'NUS',
  }),
})

export const buildPriceRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/pri/spt/data/',
  params: some({
    ...latestWeeklyRowParams,
    start: reportWeekIso,
    'facets[series][]': 'RWTC',
  }),
})

export const buildRefineryRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/pnp/wiup/data/',
  params: some({ start: reportWeekIso, frequency: 'weekly' }),
})

export const buildSupplyRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/sum/sndw/data/',
  params: some({ start: reportWeekIso, frequency: 'weekly' }),
})
