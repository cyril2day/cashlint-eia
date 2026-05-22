import { allPass, anyPass, cond, converge, find, ifElse, pipe, pipeWith } from '@/shared/fp'
import { bindResult, failure, mapResult, success, type Result, combineResults } from '@/shared/result'
import { map as mapMaybe, unwrap } from '@/shared/maybe'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { ContextualizedSignal, ContextualizedSignalSet } from '@/contexts/interpretation/model'
import { type Trend } from '@/contexts/interpretation/model/trend'
import { getKey, hasKey } from '@/shared/object'
import { formatTrendDirection } from '@/contexts/measurement/model/trend-direction'

import type { AnalysisPolicies } from '../policies'
import {
  makeInvalidAnalysisPolicyError,
  makeInsufficientEvidenceForNarrativeError,
  makeMissingContextualizedSignalError,
  makeUnableToComposeExplanationError,
  makeUnableToComposeHeadlineError,
  makeUnableToComposeSummaryError,
  makeUnableToDetermineWalkingSkeletonConditionError,
  type AnalysisError,
} from '../errors'
import { createAnalysisCondition, type AnalysisCondition } from '../model/analysis-condition'
import { type AnalysisConditionLabel } from '../model/analysis-condition'
import { createAnalysisConfidence, type AnalysisConfidence } from '../model/analysis-confidence'
import { type AnalysisConfidenceLabel } from '../model/analysis-confidence'
import {
  createAnalysisSignalAlignment,
  type AnalysisSignalAlignment,
} from '../model/analysis-signal-alignment'
import {
  createFullSystemBalanceNotComputedCaveat,
  createPropagatedInterpretationCaveat,
  createRefineryDataNotIncludedCaveat,
  createSupplyDataNotIncludedCaveat,
  type AnalysisCaveat,
} from '../model/analysis-caveat'
import { createTrendNotComputedCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import { createWeeklyAnalysis, type AnalysisKeySignals, type WeeklyAnalysis } from '../model/weekly-analysis'

export type AnalysisSignalInput = Partial<ContextualizedSignalSet>

type AnalysisCompositionStart = Readonly<{
  readonly facts: WeeklyPetroleumFacts
  readonly keySignals: AnalysisKeySignals
  readonly validatedPolicies: AnalysisPolicies
}>

type AnalysisCompositionWithAlignment = AnalysisCompositionStart & Readonly<{
  readonly alignment: AnalysisSignalAlignment
}>

type AnalysisCompositionWithCondition = AnalysisCompositionWithAlignment & Readonly<{
  readonly condition: AnalysisCondition
}>

type AnalysisCompositionWithConfidence = AnalysisCompositionWithCondition & Readonly<{
  readonly confidence: AnalysisConfidence
}>

type AnalysisCompositionWithCaveats = AnalysisCompositionWithConfidence & Readonly<{
  readonly caveats: readonly AnalysisCaveat[]
}>

type AnalysisCompositionWithHeadline = AnalysisCompositionWithCaveats & Readonly<{
  readonly headline: string
}>

type AnalysisCompositionWithSummary = AnalysisCompositionWithHeadline & Readonly<{
  readonly summary: string
}>

type AnalysisCompositionWithExplanation = AnalysisCompositionWithSummary & Readonly<{
  readonly explanation: string
}>

const isNonEmptyString = (value: string): boolean => value.trim().length > 0

const validateNarrativeTone = (
  text: string,
  policies: AnalysisPolicies,
  field: 'headline' | 'summary' | 'explanation',
): Result<string, AnalysisError> => {
  const lowerText = text.toLowerCase()
  const forbiddenPhrase = policies.forbiddenNarrativePhrases.find(phrase => lowerText.includes(phrase.toLowerCase()))

  return ifElse(
    () => forbiddenPhrase === undefined,
    () => success(text),
    () => failure(makeInsufficientEvidenceForNarrativeError(`${field} used forbidden narrative phrase: ${String(forbiddenPhrase)}`)),
  )()
}

const isPropagatedInterpretationCaveat = (
  caveat: AnalysisCaveat,
): caveat is Extract<AnalysisCaveat, { readonly kind: 'PropagatedInterpretationCaveat' }> =>
  caveat.kind === 'PropagatedInterpretationCaveat'

const hasRequestedSignal = (key: 'inventory' | 'price') =>
  (candidate: AnalysisSignalInput): candidate is AnalysisSignalInput & Record<typeof key, ContextualizedSignal> =>
    allPass([hasKey(key), (value: AnalysisSignalInput) => value[key] !== undefined])(candidate)

const selectRequestedSignal = (
  signals: AnalysisSignalInput,
  key: 'inventory' | 'price',
): Result<ContextualizedSignal, AnalysisError> =>
  ifElse(
    hasRequestedSignal(key),
    (candidate: AnalysisSignalInput & Record<typeof key, ContextualizedSignal>) => success(candidate[key]),
    () => failure(makeMissingContextualizedSignalError(key)),
  )(signals)

const validatePolicies = (policies: AnalysisPolicies): Result<AnalysisPolicies, AnalysisError> => {
  const isValidPolicies = allPass([
    (candidate: AnalysisPolicies) => candidate.preferredNarrativePhrases.length > 0,
    (candidate: AnalysisPolicies) => candidate.forbiddenNarrativePhrases.length > 0,
    (candidate: AnalysisPolicies) => isNonEmptyString(candidate.fullSystemBalanceNotComputedReason),
    (candidate: AnalysisPolicies) => isNonEmptyString(candidate.refineryDataNotIncludedReason),
    (candidate: AnalysisPolicies) => isNonEmptyString(candidate.supplyDataNotIncludedReason),
  ])

  return ifElse(
    isValidPolicies,
    () => success(policies),
    () => failure(makeInvalidAnalysisPolicyError('walking-skeleton analysis policy is incomplete')),
  )(policies)
}

export const selectWalkingSkeletonSignals = (signals: AnalysisSignalInput): Result<AnalysisKeySignals, AnalysisError> => {
  const inventoryResult = selectRequestedSignal(signals, 'inventory')
  const priceResult = selectRequestedSignal(signals, 'price')

  return combineResults(inventoryResult, priceResult, (inventory, price) => ({ inventory, price }))
}

const getTrendDirection = (signal: ContextualizedSignal): string | undefined => {
  const trend = signal.trend

  return unwrap(mapMaybe((candidate: Trend) => formatTrendDirection(candidate.direction))(trend))
}

export const classifyWalkingSkeletonSignalAlignment = (
  signals: AnalysisKeySignals,
): Result<AnalysisSignalAlignment, AnalysisError> => {
  const inventoryDirection = getTrendDirection(signals.inventory)
  const priceDirection = getTrendDirection(signals.price)

  return cond<[], Result<AnalysisSignalAlignment, AnalysisError>>([
    [
      anyPass([
        () => inventoryDirection === undefined,
        () => priceDirection === undefined,
        () => inventoryDirection === 'Flat',
        () => priceDirection === 'Flat',
      ]),
      () => success(createAnalysisSignalAlignment('Insufficient')),
    ],
    [
      allPass([() => inventoryDirection === 'Down', () => priceDirection === 'Up']),
      () => success(createAnalysisSignalAlignment('AlignedTightening')),
    ],
    [
      allPass([() => inventoryDirection === 'Up', () => priceDirection === 'Down']),
      () => success(createAnalysisSignalAlignment('AlignedLoosening')),
    ],
    [
      anyPass([
        allPass([() => inventoryDirection === 'Up', () => priceDirection === 'Up']),
        allPass([() => inventoryDirection === 'Down', () => priceDirection === 'Down']),
      ]),
      () => success(createAnalysisSignalAlignment('Mixed')),
    ],
    [
      () => true,
      () => failure(makeUnableToDetermineWalkingSkeletonConditionError('unable to classify inventory and price alignment')),
    ],
  ])()
}

export const assignWalkingSkeletonCondition = (
  alignment: AnalysisSignalAlignment,
  policies: AnalysisPolicies,
): Result<AnalysisCondition, AnalysisError> =>
  cond<[], Result<AnalysisCondition, AnalysisError>>([
    [
      () => alignment.alignment === 'AlignedTightening',
      () =>
        success(
          createAnalysisCondition(
            cond<[], AnalysisConditionLabel>([
              [() => policies.allowProvisionalConditionLabels, () => policies.provisionalTighteningConditionLabel],
              [() => true, () => policies.insufficientConditionLabel],
            ])(),
          ),
        ),
    ],
    [
      () => alignment.alignment === 'AlignedLoosening',
      () =>
        success(
          createAnalysisCondition(
            cond<[], AnalysisConditionLabel>([
              [() => policies.allowProvisionalConditionLabels, () => policies.provisionalLooseningConditionLabel],
              [() => true, () => policies.insufficientConditionLabel],
            ])(),
          ),
        ),
    ],
    [() => alignment.alignment === 'Mixed', () => success(createAnalysisCondition(policies.mixedConditionLabel))],
    [() => alignment.alignment === 'Insufficient', () => success(createAnalysisCondition(policies.insufficientConditionLabel))],
    [
      () => true,
      () => failure(makeUnableToDetermineWalkingSkeletonConditionError(`unsupported alignment: ${alignment.alignment}`)),
    ],
  ])()

export const assignWalkingSkeletonConfidence = (
  alignment: AnalysisSignalAlignment,
  policies: AnalysisPolicies,
): Result<AnalysisConfidence, AnalysisError> => {
  const label = cond<[], AnalysisConfidenceLabel>([
    [anyPass([() => alignment.alignment === 'AlignedTightening', () => alignment.alignment === 'AlignedLoosening']), () => policies.alignedConfidenceLabel],
    [() => alignment.alignment === 'Mixed', () => policies.mixedConfidenceLabel],
    [() => true, () => policies.insufficientConfidenceLabel],
  ])()

  return success(createAnalysisConfidence(label))
}

type DirectionDescriptor = Readonly<{
  readonly direction: Trend['direction']['direction']
  readonly phrase: string
}>

const inventoryDirectionDescriptors: readonly DirectionDescriptor[] = [
  { direction: 'Down', phrase: 'Crude inventory drew' },
  { direction: 'Up', phrase: 'Crude inventory built' },
  { direction: 'Flat', phrase: 'Crude inventory trend was not clear' },
]

const priceDirectionDescriptors: readonly DirectionDescriptor[] = [
  { direction: 'Up', phrase: 'WTI rose' },
  { direction: 'Down', phrase: 'WTI fell' },
  { direction: 'Flat', phrase: 'WTI trend was not clear' },
]

const resolveDirectionalPhrase = (
  direction: Trend['direction']['direction'] | undefined,
  descriptors: readonly DirectionDescriptor[],
  fallback: string,
): string =>
  pipe(
    find((candidate: DirectionDescriptor) => candidate.direction === direction),
    ifElse(
      (candidate: DirectionDescriptor | undefined): candidate is DirectionDescriptor => candidate !== undefined,
      candidate => candidate.phrase,
      () => fallback,
    ),
  )(descriptors)

const describeInventory = (signal: ContextualizedSignal): string => {
  const direction = unwrap(mapMaybe((candidate: Trend) => candidate.direction.direction)(signal.trend))

  return resolveDirectionalPhrase(direction, inventoryDirectionDescriptors, 'Crude inventory trend was not clear')
}

const describePrice = (signal: ContextualizedSignal): string => {
  const direction = unwrap(mapMaybe((candidate: Trend) => candidate.direction.direction)(signal.trend))

  return resolveDirectionalPhrase(direction, priceDirectionDescriptors, 'WTI trend was not clear')
}

const describeAlignment = (alignment: AnalysisSignalAlignment): string =>
  cond<[], string>([
    [() => alignment.alignment === 'AlignedTightening', () => 'which suggests a tighter signal'],
    [() => alignment.alignment === 'AlignedLoosening', () => 'which suggests a looser signal'],
    [() => alignment.alignment === 'Mixed', () => 'so the read stays mixed'],
    [() => true, () => 'so the read stays cautious'],
  ])()

const headlineForSignals = converge(
  (inventoryPhrase: string, pricePhrase: string, alignmentPhrase: string) =>
    `${inventoryPhrase} and ${pricePhrase}, ${alignmentPhrase}.`,
  [
    (signals: AnalysisKeySignals) => describeInventory(signals.inventory),
    (signals: AnalysisKeySignals) => describePrice(signals.price),
    (_signals: AnalysisKeySignals, alignment: AnalysisSignalAlignment) => describeAlignment(alignment),
  ],
)


const caveatKey = (caveat: AnalysisCaveat): string =>
  cond<[AnalysisCaveat], string>([
    [isPropagatedInterpretationCaveat, candidate => `propagated:${JSON.stringify(getKey('source')(candidate))}`],
    [() => true, candidate => `${candidate.kind}:${String(getKey('reason')(candidate))}`],
  ])(caveat)

const dedupeCaveats = (caveats: readonly AnalysisCaveat[]): readonly AnalysisCaveat[] => {
  const seen = new Set<string>()

  return caveats.filter((caveat) => {
    const key = caveatKey(caveat)
    const before = seen.size
    seen.add(key)
    return seen.size !== before
  })
}

export const buildWalkingSkeletonCaveats = (
  signals: AnalysisKeySignals,
  policies: AnalysisPolicies,
): readonly AnalysisCaveat[] => {
  const propagatedFromInventory = signals.inventory.caveats.map(createPropagatedInterpretationCaveat)
  const propagatedFromPrice = signals.price.caveats.map(createPropagatedInterpretationCaveat)

  const explicitInventoryTrendMissing = unwrap(signals.inventory.trend) === undefined
  const explicitPriceTrendMissing = unwrap(signals.price.trend) === undefined

  const propagatedFromInventoryFinal = ifElse(
    () => explicitInventoryTrendMissing,
    () => [...propagatedFromInventory, createPropagatedInterpretationCaveat(createTrendNotComputedCaveat(signals.inventory.signal.identity))],
    () => propagatedFromInventory,
  )()

  const propagatedFromPriceFinal = ifElse(
    () => explicitPriceTrendMissing,
    () => [...propagatedFromPrice, createPropagatedInterpretationCaveat(createTrendNotComputedCaveat(signals.price.signal.identity))],
    () => propagatedFromPrice,
  )()

  return dedupeCaveats([
    createFullSystemBalanceNotComputedCaveat(policies.fullSystemBalanceNotComputedReason),
    createRefineryDataNotIncludedCaveat(policies.refineryDataNotIncludedReason),
    createSupplyDataNotIncludedCaveat(policies.supplyDataNotIncludedReason),
    ...propagatedFromInventoryFinal,
    ...propagatedFromPriceFinal,
  ])
}

export const buildWalkingSkeletonHeadline = (
  signals: AnalysisKeySignals,
  alignment: AnalysisSignalAlignment,
  policies: AnalysisPolicies,
): Result<string, AnalysisError> => {
  const headline = headlineForSignals(signals, alignment)

  return bindResult(
    ifElse(
    () => isNonEmptyString(headline),
    () => success(headline),
    () => failure(makeUnableToComposeHeadlineError('headline was empty')),
  )(), candidate => validateNarrativeTone(candidate, policies, 'headline'))
}

export const buildWalkingSkeletonSummary = (
  signals: AnalysisKeySignals,
  alignment: AnalysisSignalAlignment,
  caveats: readonly AnalysisCaveat[],
  _policies: AnalysisPolicies,
): Result<string, AnalysisError> => {
  const note = cond<[], string>([
    [
      anyPass([() => alignment.alignment === 'AlignedTightening', () => alignment.alignment === 'AlignedLoosening']),
      () => 'This is consistent with a tighter or looser signal, but full system balance is not computed.',
    ],
    [() => alignment.alignment === 'Mixed', () => 'The signals are mixed, so the walking skeleton stays cautious.'],
    [() => true, () => 'The trend context is incomplete, so the walking skeleton stays cautious.'],
  ])()

  const caveatNote = caveats
    .filter((caveat) => caveat.kind !== 'PropagatedInterpretationCaveat')
    .map((caveat) => caveat.reason)
    .join(' ')

  const summary = `${describeInventory(signals.inventory)} while ${describePrice(signals.price)}. ${note} ${caveatNote}`.trim()

  return bindResult(
    ifElse(
    () => isNonEmptyString(summary),
    () => success(summary),
    () => failure(makeUnableToComposeSummaryError('summary was empty')),
  )(), candidate => validateNarrativeTone(candidate, _policies, 'summary'))
}

const isPropagatedTrendNotComputed = (caveat: AnalysisCaveat): boolean =>
  ifElse(
    (candidate: AnalysisCaveat): candidate is Extract<AnalysisCaveat, { readonly kind: 'PropagatedInterpretationCaveat' }> =>
      candidate.kind === 'PropagatedInterpretationCaveat',
    candidate => candidate.source.kind === 'TrendNotComputed',
    () => false,
  )(caveat)

export const buildWalkingSkeletonExplanation = (
  signals: AnalysisKeySignals,
  alignment: AnalysisSignalAlignment,
  caveats: readonly AnalysisCaveat[],
  policies: AnalysisPolicies,
): Result<string, AnalysisError> => {
  const trendNote = ifElse(
    () => caveats.some(isPropagatedTrendNotComputed),
    () => 'Trend context is incomplete for at least one signal.',
    () => '',
  )()

  const explanation = `${describeInventory(signals.inventory)} is the physical storage signal, and ${describePrice(signals.price)} is market context. ${describeAlignment(alignment)}. ${policies.fullSystemBalanceNotComputedReason} ${policies.refineryDataNotIncludedReason} ${policies.supplyDataNotIncludedReason} ${trendNote}`.trim()

  return bindResult(
    ifElse(
    () => isNonEmptyString(explanation),
    () => success(explanation),
    () => failure(makeUnableToComposeExplanationError('explanation was empty')),
  )(), candidate => validateNarrativeTone(candidate, policies, 'explanation'))
}

const assembleWeeklyAnalysisResult = (
  context: AnalysisCompositionWithExplanation,
): WeeklyAnalysis => {
  const supportingSignals = switchSignalSupport(context)
  const contradictorySignals = switchSignalContradictions(context)

  return createWeeklyAnalysis(
    context.facts.reportWeek,
    context.facts.geography,
    context.condition,
    context.headline,
    context.summary,
    context.explanation,
    context.keySignals,
    supportingSignals,
    contradictorySignals,
    context.caveats,
    context.confidence,
    context.alignment,
  )
}

const switchSignalSupport = (context: AnalysisCompositionWithExplanation): readonly ContextualizedSignal[] => {
  return ifElse(
    anyPass([() => context.alignment.alignment === 'AlignedTightening', () => context.alignment.alignment === 'AlignedLoosening']),
    () => [context.keySignals.inventory, context.keySignals.price],
    () => [],
  )()
}

const switchSignalContradictions = (context: AnalysisCompositionWithExplanation): readonly ContextualizedSignal[] =>
  ifElse(
    () => context.alignment.alignment === 'Mixed',
    () => [context.keySignals.inventory, context.keySignals.price],
    () => [],
  )()

const composeFromKeySignals = (
  facts: WeeklyPetroleumFacts,
  keySignals: AnalysisKeySignals,
  validatedPolicies: AnalysisPolicies,
): Result<WeeklyAnalysis, AnalysisError> => {
  const pipeline = pipeWith(
    <InputValue, FailureValue, OutputValue>(step: (value: InputValue) => Result<OutputValue, FailureValue>, result: Result<InputValue, FailureValue>) => bindResult(result, step),
    [
      (context: AnalysisCompositionStart) =>
        mapResult(classifyWalkingSkeletonSignalAlignment(context.keySignals), alignment => ({ ...context, alignment })),
      (context: AnalysisCompositionWithAlignment) =>
        mapResult(assignWalkingSkeletonCondition(context.alignment, context.validatedPolicies), condition => ({ ...context, condition })),
      (context: AnalysisCompositionWithCondition) =>
        mapResult(assignWalkingSkeletonConfidence(context.alignment, context.validatedPolicies), confidence => ({ ...context, confidence })),
      (context: AnalysisCompositionWithConfidence) =>
        success({
          ...context,
          caveats: buildWalkingSkeletonCaveats(context.keySignals, context.validatedPolicies),
        }),
      (context: AnalysisCompositionWithCaveats) =>
        mapResult(buildWalkingSkeletonHeadline(context.keySignals, context.alignment, context.validatedPolicies), headline => ({ ...context, headline })),
      (context: AnalysisCompositionWithHeadline) =>
        mapResult(buildWalkingSkeletonSummary(context.keySignals, context.alignment, context.caveats, context.validatedPolicies), summary => ({ ...context, summary })),
      (context: AnalysisCompositionWithSummary) =>
        mapResult(buildWalkingSkeletonExplanation(context.keySignals, context.alignment, context.caveats, context.validatedPolicies), explanation => ({ ...context, explanation })),
      (context: AnalysisCompositionWithExplanation) => success(assembleWeeklyAnalysisResult(context)),
    ],
  )

  return pipeline({ facts, keySignals, validatedPolicies })
}

export const composeWeeklyAnalysis = (
  facts: WeeklyPetroleumFacts,
  signals: AnalysisSignalInput,
  policies: AnalysisPolicies,
): Result<WeeklyAnalysis, AnalysisError> => {
  const pipeline = pipeWith(
    <InputValue, FailureValue, OutputValue>(step: (value: InputValue) => Result<OutputValue, FailureValue>, result: Result<InputValue, FailureValue>) => bindResult(result, step),
    [
      validatePolicies,
      (validatedPolicies: AnalysisPolicies) =>
        mapResult(selectWalkingSkeletonSignals(signals), keySignals => ({ validatedPolicies, keySignals })),
      (context: Readonly<{ readonly validatedPolicies: AnalysisPolicies; readonly keySignals: AnalysisKeySignals }>) =>
        composeFromKeySignals(facts, context.keySignals, context.validatedPolicies),
    ],
  )

  return pipeline(policies)
}