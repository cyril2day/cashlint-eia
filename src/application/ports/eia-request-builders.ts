import type { EiaRequest } from '@/application/ports/eia-client'
import { some } from '@/shared/maybe'

const refinerySeriesIds: readonly string[] = ['WCRRIUS2', 'WGIRIUS2', 'WOCLEUS2', 'WPULEUS3']
const supplySeriesIds: readonly string[] = ['WCRFPUS2', 'WCRIMUS2', 'WCREXUS2']
const weeklyHistoryRowCount = '12'

const weeklyHistoryRowParams = {
  frequency: 'weekly',
  'data[]': 'value',
  'sort[0][column]': 'period',
  'sort[0][direction]': 'desc',
  offset: '0',
  length: weeklyHistoryRowCount,
}

export const buildInventoryRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/stoc/wstk/data/',
  params: some({
    ...weeklyHistoryRowParams,
    end: reportWeekIso,
    'facets[series][]': 'WCRSTUS1',
    'facets[duoarea][]': 'NUS',
  }),
})

export const buildPriceRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/pri/spt/data/',
  params: some({
    ...weeklyHistoryRowParams,
    end: reportWeekIso,
    'facets[series][]': 'RWTC',
  }),
})

const buildSeriesRequest = (
  endpoint: string,
  reportWeekIso: string,
  seriesId: string,
): EiaRequest => ({
  endpoint,
  params: some({
    ...weeklyHistoryRowParams,
    end: reportWeekIso,
    'facets[series][]': seriesId,
  }),
})

const buildSeriesGroupRequest = (
  endpoint: string,
  reportWeekIso: string,
  seriesIds: readonly string[],
): EiaRequest => ({
  endpoint,
  params: some({
    ...weeklyHistoryRowParams,
    end: reportWeekIso,
    'facets[series][]': seriesIds,
  }),
})

export const buildRefineryRequest = (reportWeekIso: string): EiaRequest =>
  buildSeriesRequest('/v2/petroleum/pnp/wiup/data/', reportWeekIso, refinerySeriesIds[0])

export const buildRefineryRequests = (reportWeekIso: string): readonly EiaRequest[] =>
  [buildSeriesGroupRequest('/v2/petroleum/pnp/wiup/data/', reportWeekIso, refinerySeriesIds)]

export const buildSupplyRequest = (reportWeekIso: string): EiaRequest =>
  buildSeriesRequest('/v2/petroleum/sum/sndw/data/', reportWeekIso, supplySeriesIds[0])

export const buildSupplyRequests = (reportWeekIso: string): readonly EiaRequest[] =>
  [buildSeriesGroupRequest('/v2/petroleum/sum/sndw/data/', reportWeekIso, supplySeriesIds)]

export const buildUnfacetedRefineryRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/pnp/wiup/data/',
  params: some({ start: reportWeekIso, frequency: 'weekly' }),
})

export const buildUnfacetedSupplyRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/sum/sndw/data/',
  params: some({ start: reportWeekIso, frequency: 'weekly' }),
})
