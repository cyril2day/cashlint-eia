import { describe, expect, it } from 'vitest'

import {
  composeFullWeeklyAnalysis,
  composeWeeklyAnalysis,
  createFullAnalysisPolicies,
  createCoreWeeklyAnalysisPolicies,
  selectCoreWeeklySignals,
} from '@/contexts/analysis'

describe('Analysis public exports', () => {
  it('exposes the core-weekly analysis surface', () => {
    expect(typeof composeWeeklyAnalysis).toBe('function')
    expect(typeof composeFullWeeklyAnalysis).toBe('function')
    expect(typeof createCoreWeeklyAnalysisPolicies).toBe('function')
    expect(typeof createFullAnalysisPolicies).toBe('function')
    expect(typeof selectCoreWeeklySignals).toBe('function')

    const policies = createCoreWeeklyAnalysisPolicies()

    expect(policies.allowProvisionalConditionLabels).toBe(false)
  })
})