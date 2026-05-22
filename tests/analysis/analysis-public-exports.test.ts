import { describe, expect, it } from 'vitest'

import {
  composeWeeklyAnalysis,
  createWalkingSkeletonAnalysisPolicies,
  selectWalkingSkeletonSignals,
} from '@/contexts/analysis'

describe('Analysis public exports', () => {
  it('exposes the walking-skeleton analysis surface', () => {
    expect(typeof composeWeeklyAnalysis).toBe('function')
    expect(typeof createWalkingSkeletonAnalysisPolicies).toBe('function')
    expect(typeof selectWalkingSkeletonSignals).toBe('function')

    const policies = createWalkingSkeletonAnalysisPolicies()

    expect(policies.allowProvisionalConditionLabels).toBe(false)
  })
})