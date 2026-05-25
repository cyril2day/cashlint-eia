import { allPass, anyPass, cond, converge, find, ifElse, isNonEmptyString, pipe, pipeWith } from '@/shared/fp'
import { bindResult, bindResultStep, failure, mapResult, success, type Result, combineResults } from '@/shared/result'
import { isNone, map as mapMaybe, unwrap } from '@/shared/maybe'
import type { WeeklyPetroleumFacts } from '@/contexts/measurement/model/weekly-petroleum-facts'
import type { ContextualizedSignal, ContextualizedSignalSet } from '@/contexts/interpretation/model'
import { type Trend } from '@/contexts/interpretation/model/trend'
import type { TrendDirectionLabel } from '@/contexts/measurement/model/trend-direction'
import { getKey, hasKey } from '@/shared/object'

import type { AnalysisPolicies } from '@/contexts/analysis/policies'
import {
  makeInvalidAnalysisPolicyError,
  makeInsufficientEvidenceForNarrativeError,
  makeMissingContextualizedSignalError,
  makeUnableToComposeExplanationError,
  makeUnableToComposeHeadlineError,
  makeUnableToComposeSummaryError,
  makeUnableToDetermineCoreWeeklyConditionError,
  type AnalysisError,
} from '@/contexts/analysis/errors'
import { createAnalysisCondition, type AnalysisCondition } from '@/contexts/analysis/model/analysis-condition'
import { type AnalysisConditionLabel } from '@/contexts/analysis/model/analysis-condition'
import { createAnalysisConfidence, type AnalysisConfidence } from '@/contexts/analysis/model/analysis-confidence'
import { type AnalysisConfidenceLabel } from '@/contexts/analysis/model/analysis-confidence'
import {
  createAnalysisSignalAlignment,
  type AnalysisSignalAlignment,
} from '@/contexts/analysis/model/analysis-signal-alignment'
import {
  createFullSystemBalanceNotComputedCaveat,
  createPropagatedInterpretationCaveat,
  createRefineryDataNotIncludedCaveat,
  createSupplyDataNotIncludedCaveat,
  type AnalysisCaveat,
} from '@/contexts/analysis/model/analysis-caveat'
import { createTrendNotComputedCaveat } from '@/contexts/interpretation/model/interpretation-caveat'
import { createWeeklyAnalysis, type AnalysisKeySignals, type WeeklyAnalysis } from '@/contexts/analysis/model/weekly-analysis'

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

type AnalysisCompositionReady = Readonly<{
  readonly validatedPolicies: AnalysisPolicies
  readonly keySignals: AnalysisKeySignals
}>

const resolveAlignedConditionLabel = (
  allowProvisionalConditionLabels: boolean,
  provisionalLabel: AnalysisConditionLabel,
  insufficientLabel: AnalysisConditionLabel,
): AnalysisConditionLabel =>
  ifElse(
    () => allowProvisionalConditionLabels,
    () => provisionalLabel,
    () => insufficientLabel,
  )()

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

const ensureNonEmptyNarrative = (
  text: string,
  field: 'headline' | 'summary' | 'explanation',
  makeEmptyNarrativeError: (reason: string) => AnalysisError,
): Result<string, AnalysisError> =>
  ifElse(
    () => isNonEmptyString(text),
    () => success(text),
    () => failure(makeEmptyNarrativeError(`${field} was empty`)),
  )()

const validateCoreWeeklyNarrative = (
  text: string,
  policies: AnalysisPolicies,
  field: 'headline' | 'summary' | 'explanation',
  makeEmptyNarrativeError: (reason: string) => AnalysisError,
): Result<string, AnalysisError> =>
  bindResult(
    ensureNonEmptyNarrative(text, field, makeEmptyNarrativeError),
    candidate => validateNarrativeTone(candidate, policies, field),
  )

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
    () => failure(makeInvalidAnalysisPolicyError('core-weekly analysis policy is incomplete')),
  )(policies)
}

export const selectCoreWeeklySignals = (signals: AnalysisSignalInput): Result<AnalysisKeySignals, AnalysisError> => {
  const inventoryResult = selectRequestedSignal(signals, 'inventory')
  const priceResult = selectRequestedSignal(signals, 'price')

  return combineResults(inventoryResult, priceResult, (inventory, price) => ({ inventory, price }))
}

const getTrendDirection = (signal: ContextualizedSignal): TrendDirectionLabel | undefined =>
  unwrap(mapMaybe((candidate: Trend) => candidate.direction.direction)(signal.trend))

const buildPropagatedSignalCaveats = (signal: ContextualizedSignal): readonly AnalysisCaveat[] => {
  const propagatedCaveats = signal.caveats.map(createPropagatedInterpretationCaveat)

  return ifElse(
    isNone,
    () => [...propagatedCaveats, createPropagatedInterpretationCaveat(createTrendNotComputedCaveat(signal.signal.identity))],
    () => propagatedCaveats,
  )(signal.trend)
}

export const classifyCoreWeeklySignalAlignment = (
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
      () => failure(makeUnableToDetermineCoreWeeklyConditionError('unable to classify inventory and price alignment')),
    ],
  ])()
}

export const assignCoreWeeklyCondition = (
  alignment: AnalysisSignalAlignment,
  policies: AnalysisPolicies,
): Result<AnalysisCondition, AnalysisError> =>
  cond<[], Result<AnalysisCondition, AnalysisError>>([
    [
      () => alignment.alignment === 'AlignedTightening',
      () =>
        success(
          createAnalysisCondition(
            resolveAlignedConditionLabel(
              policies.allowProvisionalConditionLabels,
              policies.provisionalTighteningConditionLabel,
              policies.insufficientConditionLabel,
            ),
          ),
        ),
    ],
    [
      () => alignment.alignment === 'AlignedLoosening',
      () =>
        success(
          createAnalysisCondition(
            resolveAlignedConditionLabel(
              policies.allowProvisionalConditionLabels,
              policies.provisionalLooseningConditionLabel,
              policies.insufficientConditionLabel,
            ),
          ),
        ),
    ],
    [() => alignment.alignment === 'Mixed', () => success(createAnalysisCondition(policies.mixedConditionLabel))],
    [() => alignment.alignment === 'Insufficient', () => success(createAnalysisCondition(policies.insufficientConditionLabel))],
    [
      () => true,
      () => failure(makeUnableToDetermineCoreWeeklyConditionError(`unsupported alignment: ${alignment.alignment}`)),
    ],
  ])()

export const assignCoreWeeklyConfidence = (
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

const describeInventory = (signal: ContextualizedSignal): string =>
  resolveDirectionalPhrase(getTrendDirection(signal), inventoryDirectionDescriptors, 'Crude inventory trend was not clear')

const describePrice = (signal: ContextualizedSignal): string =>
  resolveDirectionalPhrase(getTrendDirection(signal), priceDirectionDescriptors, 'WTI trend was not clear')

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
  ifElse(
    isPropagatedInterpretationCaveat,
    candidate => `propagated:${JSON.stringify(getKey('source')(candidate))}`,
    candidate => `${candidate.kind}:${String(getKey('reason')(candidate))}`,
  )(caveat)

const dedupeCaveats = (caveats: readonly AnalysisCaveat[]): readonly AnalysisCaveat[] => {
  const seen = new Set<string>()

  return caveats.filter((caveat) => {
    const key = caveatKey(caveat)
    const before = seen.size
    seen.add(key)
    return seen.size !== before
  })
}

const composeNarrative = (...parts: readonly string[]): string => parts.filter(isNonEmptyString).join(' ')

const formatNonPropagatedCaveatReasons = (caveats: readonly AnalysisCaveat[]): string =>
  caveats
    .filter((caveat): caveat is Exclude<AnalysisCaveat, { readonly kind: 'PropagatedInterpretationCaveat' }> =>
      caveat.kind !== 'PropagatedInterpretationCaveat',
    )
    .map(caveat =>
      ifElse(
        (candidate: Exclude<AnalysisCaveat, { readonly kind: 'PropagatedInterpretationCaveat' }>): candidate is Extract<AnalysisCaveat, { readonly kind: 'PropagatedSystemBalanceCaveat' }> =>
          candidate.kind === 'PropagatedSystemBalanceCaveat',
        candidate => candidate.source.kind,
        candidate => candidate.reason,
      )(caveat),
    )
    .join(' ')

export const buildCoreWeeklyCaveats = (
  signals: AnalysisKeySignals,
  policies: AnalysisPolicies,
): readonly AnalysisCaveat[] => {
  return dedupeCaveats([
    createFullSystemBalanceNotComputedCaveat(policies.fullSystemBalanceNotComputedReason),
    createRefineryDataNotIncludedCaveat(policies.refineryDataNotIncludedReason),
    createSupplyDataNotIncludedCaveat(policies.supplyDataNotIncludedReason),
    ...buildPropagatedSignalCaveats(signals.inventory),
    ...buildPropagatedSignalCaveats(signals.price),
  ])
}

export const buildCoreWeeklyHeadline = (
  signals: AnalysisKeySignals,
  alignment: AnalysisSignalAlignment,
  policies: AnalysisPolicies,
): Result<string, AnalysisError> => {
  const headline = headlineForSignals(signals, alignment)

  return validateCoreWeeklyNarrative(headline, policies, 'headline', makeUnableToComposeHeadlineError)
}

export const buildCoreWeeklySummary = (
  signals: AnalysisKeySignals,
  alignment: AnalysisSignalAlignment,
  caveats: readonly AnalysisCaveat[],
  policies: AnalysisPolicies,
): Result<string, AnalysisError> => {
  const note = cond<[], string>([
    [
      anyPass([() => alignment.alignment === 'AlignedTightening', () => alignment.alignment === 'AlignedLoosening']),
      () => 'This is consistent with a tighter or looser signal, but full system balance is not computed.',
    ],
    [() => alignment.alignment === 'Mixed', () => 'The signals are mixed, so this read stays cautious.'],
    [() => true, () => 'The trend context is incomplete, so this read stays cautious.'],
  ])()

  const summary = composeNarrative(
    `${describeInventory(signals.inventory)} while ${describePrice(signals.price)}.`,
    note,
    formatNonPropagatedCaveatReasons(caveats),
  )

  return validateCoreWeeklyNarrative(summary, policies, 'summary', makeUnableToComposeSummaryError)
}

const isPropagatedTrendNotComputed = (caveat: AnalysisCaveat): boolean =>
  ifElse(
    (candidate: AnalysisCaveat): candidate is Extract<AnalysisCaveat, { readonly kind: 'PropagatedInterpretationCaveat' }> =>
      candidate.kind === 'PropagatedInterpretationCaveat',
    candidate => candidate.source.kind === 'TrendNotComputed',
    () => false,
  )(caveat)

export const buildCoreWeeklyExplanation = (
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

  const explanation = composeNarrative(
    `${describeInventory(signals.inventory)} is the physical storage signal, and ${describePrice(signals.price)} is market context.`,
    `${describeAlignment(alignment)}.`,
    policies.fullSystemBalanceNotComputedReason,
    policies.refineryDataNotIncludedReason,
    policies.supplyDataNotIncludedReason,
    trendNote,
  )

  return validateCoreWeeklyNarrative(explanation, policies, 'explanation', makeUnableToComposeExplanationError)
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

const addAlignment = (
  context: AnalysisCompositionStart,
): Result<AnalysisCompositionWithAlignment, AnalysisError> =>
  mapResult(
    classifyCoreWeeklySignalAlignment(context.keySignals),
    alignment => ({ ...context, alignment }),
  )

const addCondition = (
  context: AnalysisCompositionWithAlignment,
): Result<AnalysisCompositionWithCondition, AnalysisError> =>
  mapResult(
    assignCoreWeeklyCondition(context.alignment, context.validatedPolicies),
    condition => ({ ...context, condition }),
  )

const addConfidence = (
  context: AnalysisCompositionWithCondition,
): Result<AnalysisCompositionWithConfidence, AnalysisError> =>
  mapResult(
    assignCoreWeeklyConfidence(context.alignment, context.validatedPolicies),
    confidence => ({ ...context, confidence }),
  )

const addCaveats = (
  context: AnalysisCompositionWithConfidence,
): Result<AnalysisCompositionWithCaveats, AnalysisError> =>
  success({
    ...context,
    caveats: buildCoreWeeklyCaveats(context.keySignals, context.validatedPolicies),
  })

const addHeadline = (
  context: AnalysisCompositionWithCaveats,
): Result<AnalysisCompositionWithHeadline, AnalysisError> =>
  mapResult(
    buildCoreWeeklyHeadline(context.keySignals, context.alignment, context.validatedPolicies),
    headline => ({ ...context, headline }),
  )

const addSummary = (
  context: AnalysisCompositionWithHeadline,
): Result<AnalysisCompositionWithSummary, AnalysisError> =>
  mapResult(
    buildCoreWeeklySummary(context.keySignals, context.alignment, context.caveats, context.validatedPolicies),
    summary => ({ ...context, summary }),
  )

const addExplanation = (
  context: AnalysisCompositionWithSummary,
): Result<AnalysisCompositionWithExplanation, AnalysisError> =>
  mapResult(
    buildCoreWeeklyExplanation(context.keySignals, context.alignment, context.caveats, context.validatedPolicies),
    explanation => ({ ...context, explanation }),
  )

const finalizeWeeklyAnalysis = (
  context: AnalysisCompositionWithExplanation,
): Result<WeeklyAnalysis, AnalysisError> => success(assembleWeeklyAnalysisResult(context))

const composeFromKeySignals = (
  facts: WeeklyPetroleumFacts,
  keySignals: AnalysisKeySignals,
  validatedPolicies: AnalysisPolicies,
): Result<WeeklyAnalysis, AnalysisError> => {
  const pipeline = pipeWith(
    bindResultStep,
    [
      addAlignment,
      addCondition,
      addConfidence,
      addCaveats,
      addHeadline,
      addSummary,
      addExplanation,
      finalizeWeeklyAnalysis,
    ],
  )

  return pipeline({ facts, keySignals, validatedPolicies })
}

const addSelectedSignals =
  (signals: AnalysisSignalInput) =>
  (validatedPolicies: AnalysisPolicies): Result<AnalysisCompositionReady, AnalysisError> =>
    mapResult(selectCoreWeeklySignals(signals), keySignals => ({ validatedPolicies, keySignals }))

const composeValidatedAnalysis =
  (facts: WeeklyPetroleumFacts) =>
  (context: AnalysisCompositionReady): Result<WeeklyAnalysis, AnalysisError> =>
    composeFromKeySignals(facts, context.keySignals, context.validatedPolicies)

export const composeWeeklyAnalysis = (
  facts: WeeklyPetroleumFacts,
  signals: AnalysisSignalInput,
  policies: AnalysisPolicies,
): Result<WeeklyAnalysis, AnalysisError> => {
  const pipeline = pipeWith(
    bindResultStep,
    [
      validatePolicies,
      addSelectedSignals(signals),
      composeValidatedAnalysis(facts),
    ],
  )

  return pipeline(policies)
}
