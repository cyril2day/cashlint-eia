import { describe, it, expect } from 'vitest'
import { mapPeriodCandidateToReportWeek } from '@/contexts/measurement/normalizers/period'

describe('period normalizer', () => {
  it('maps a valid ISO period to a report week', () => {
    const r = mapPeriodCandidateToReportWeek('2026-01-09')

    expect(r.ok).toBe(true)
  })

  it('rejects an invalid calendar date', () => {
    const r = mapPeriodCandidateToReportWeek('2026-02-30')

    expect(r.ok).toBe(false)
  })
})
