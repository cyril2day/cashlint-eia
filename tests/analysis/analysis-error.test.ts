import { describe, expect, it } from 'vitest'

import { ifElse } from '@/shared/fp'
import { isSuccess, type Result } from '@/shared/result'
import type { AnalysisError } from '@/contexts/analysis/errors'

import {
  makeContradictorySignalHandlingFailureError,
  makeInsufficientEvidenceForNarrativeError,
  makeInvalidAnalysisPolicyError,
  makeMissingContextualizedSignalError,
  makeMissingRequiredAnalysisSignalError,
  makeUnableToComposeExplanationError,
  makeUnableToComposeHeadlineError,
  makeUnableToComposeSummaryError,
  makeUnableToDetermineWalkingSkeletonConditionError,
  makeUnexpectedSignalIdentityError,
} from '@/contexts/analysis/errors'
import { createInventorySignalIdentity } from '@/contexts/interpretation'
import { parseGeographyScope, parseInventoryProduct, parseMeasurementKind, parsePetroleumSlice } from '@/contexts/measurement/model'

const unwrapSuccess = <SuccessValue, FailureValue>(result: Result<SuccessValue, FailureValue>): SuccessValue =>
  ifElse(isSuccess, candidate => candidate.value, () => { throw new Error('expected a successful result') })(result)


describe('Analysis error helpers', () => {
  it('creates the expected walking-skeleton error shapes', () => {
    const requiredSignal = makeMissingRequiredAnalysisSignalError('inventory')
    const contextualizedSignal = makeMissingContextualizedSignalError('price')
    const policy = makeInvalidAnalysisPolicyError('bad policy')
    const condition = makeUnableToDetermineWalkingSkeletonConditionError('unable to classify')
    const headline = makeUnableToComposeHeadlineError('headline failed')
    const summary = makeUnableToComposeSummaryError('summary failed')
    const explanation = makeUnableToComposeExplanationError('explanation failed')
    const contradictory = makeContradictorySignalHandlingFailureError('contradiction failed')
    const narrative = makeInsufficientEvidenceForNarrativeError('narrative failed')

    expect(requiredSignal).toEqual({ kind: 'MissingRequiredAnalysisSignal', missing: 'inventory' })
    expect(contextualizedSignal).toEqual({ kind: 'MissingContextualizedSignal', missing: 'price' })
    expect(policy).toEqual({ kind: 'InvalidAnalysisPolicy', reason: 'bad policy' })
    expect(condition).toEqual({ kind: 'UnableToDetermineWalkingSkeletonCondition', reason: 'unable to classify' })
    expect(headline).toEqual({ kind: 'UnableToComposeHeadline', reason: 'headline failed' })
    expect(summary).toEqual({ kind: 'UnableToComposeSummary', reason: 'summary failed' })
    expect(explanation).toEqual({ kind: 'UnableToComposeExplanation', reason: 'explanation failed' })
    expect(contradictory).toEqual({ kind: 'ContradictorySignalHandlingFailure', reason: 'contradiction failed' })
    expect(narrative).toEqual({ kind: 'InsufficientEvidenceForNarrative', reason: 'narrative failed' })
  })

  it('creates the unexpected-signal shape from a trusted identity', () => {
    const geography = unwrapSuccess(parseGeographyScope('USTotal'))
    const measurementKind = unwrapSuccess(parseMeasurementKind('CrudeStocks'))
    const petroleumSlice = unwrapSuccess(parsePetroleumSlice('Inventory'))
    const inventoryProduct = unwrapSuccess(parseInventoryProduct('CrudeOil'))
    const identity = createInventorySignalIdentity(geography, measurementKind, petroleumSlice, inventoryProduct)

    const error = makeUnexpectedSignalIdentityError(identity)

    expect(error.kind).toBe('UnexpectedSignalIdentity')

    ifElse(
      (candidate: AnalysisError): candidate is Extract<AnalysisError, { readonly kind: 'UnexpectedSignalIdentity' }> =>
        candidate.kind === 'UnexpectedSignalIdentity',
      candidate => expect(candidate.signalIdentity).toBe(identity),
      () => { throw new Error('unexpected error kind') },
    )(error)
  })
})