import type { EiaRequest } from '@/application/ports/eia-client'
import { some } from '@/shared/maybe'

export const buildInventoryRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/stoc/wstk/data/',
  params: some({ start: reportWeekIso, frequency: 'weekly' }),
})

export const buildPriceRequest = (reportWeekIso: string): EiaRequest => ({
  endpoint: '/v2/petroleum/pri/spt/data/',
  params: some({ start: reportWeekIso, frequency: 'weekly' }),
})


