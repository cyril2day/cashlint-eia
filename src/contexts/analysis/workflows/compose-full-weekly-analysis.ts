import { allPass, anyPass, cond, ifElse, isNonEmptyString, pipe, pipeWith, sortBy } from '@/shared/fp'
import { bindResult, bindResultStep, combineResults, failure, mapResult, success, type Result } from '@/shared/result'
import { some, unwrap } from '@/shared/maybe'
import type { ContextualizedSignal, ContextualizedSignalSet } from '@/contexts/interpretation/model'
import type { Trend } from '@/contexts/interpretation/model/trend'
import { type AnalysisCondition, createAnalysisCondition } from '@/contexts/analysis/model/analysis-condition'
import { createAnalysisConfidence, type AnalysisConfidence } from '@/contexts/analysis/model/analysis-confidence'
import { type AnalysisSignalAlignment } from '@/contexts/analysis/model/analysis-signal-alignment'
import {
  createLowConfidenceCaveat,
  createMixedEvidenceCaveat,
  createPartialInterpretationCaveat,
  createPriceContradictionCaveat,
  createPropagatedInterpretationCaveat,
  createPropagatedSystemBalanceCaveat,
  type AnalysisCaveat,
} from '@/contexts/analysis/model/analysis-caveat'
import type { AnalysisKeySignals, AnalysisTrace, WeeklyAnalysis } from '@/contexts/analysis/model/weekly-analysis'
import type { FullAnalysisPolicies } from '@/contexts/analysis/policies'
import {
  makeInvalidAnalysisPolicyError,
  makeUnableToComposeFullAnalysisError,
  makeUnableToSelectKeyDriversError,
  makeUnsupportedBalanceStateError,
  type AnalysisError,
} from '@/contexts/analysis/errors'
import {
  classifyCoreWeeklySignalAlignment,
  selectCoreWeeklySignals,
} from '@/contexts/analysis/workflows/compose-weekly-analysis'
import { createFullWeeklyAnalysis } from '@/contexts/analysis/model/weekly-analysis'
import type { SystemBalanceAnalysis, SystemBalanceState, BalanceDriver } from '@/contexts/system-balance/model'

type FullAnalysisCompositionStart = Readonly<{
  readonly systemBalanceAnalysis: SystemBalanceAnalysis
  readonly keySignals: AnalysisKeySignals
  readonly alignment: AnalysisSignalAlignment
  readonly validatedPolicies: FullAnalysisPolicies
}>

type FullAnalysisCompositionWithCondition = FullAnalysisCompositionStart & Readonly<{
  readonly condition: AnalysisCondition
}>

type FullAnalysisCompositionWithDrivers = FullAnalysisCompositionWithCondition & Readonly<{
  readonly keyDrivers: readonly BalanceDriver[]
}>

type FullAnalysisCompositionWithSignalClassification = FullAnalysisCompositionWithDrivers & Readonly<{
  readonly supportingSignals: readonly ContextualizedSignal[]
  readonly contradictorySignals: readonly ContextualizedSignal[]
}>

type FullAnalysisCompositionWithQualifications = FullAnalysisCompositionWithSignalClassification & Readonly<{
  readonly historicalQualifications: readonly ContextualizedSignal[]
}>

type FullAnalysisCompositionWithCaveats = FullAnalysisCompositionWithQualifications & Readonly<{
  readonly caveats: readonly AnalysisCaveat[]
}>

type FullAnalysisCompositionWithConfidence = FullAnalysisCompositionWithCaveats & Readonly<{
  readonly confidence: AnalysisConfidence
}>

type FullAnalysisCompositionWithNarrative = FullAnalysisCompositionWithConfidence & Readonly<{
  readonly headline: string
  readonly summary: string
  readonly explanation: string
}>

const validateFullAnalysisPolicies = (policies: FullAnalysisPolicies): Result<FullAnalysisPolicies, AnalysisError> => {
  const valid = allPass([
    (candidate: FullAnalysisPolicies) => candidate.preferredNarrativePhrases.length > 0,
    (candidate: FullAnalysisPolicies) => candidate.forbiddenNarrativePhrases.length > 0,
    (candidate: FullAnalysisPolicies) => candidate.drivers.maximumCount > 0,
    (candidate: FullAnalysisPolicies) => candidate.signals.maximumCount > 0,
    (candidate: FullAnalysisPolicies) => candidate.historicalQualifications.maximumCount > 0,
  ])

  return ifElse(
    valid,
    () => success(policies),
    () => failure(makeInvalidAnalysisPolicyError('full analysis policy is incomplete')),
  )(policies)
}

export const selectFullAnalysisSignals = (signals: Partial<ContextualizedSignalSet>): Result<AnalysisKeySignals, AnalysisError> =>
  selectCoreWeeklySignals(signals)

const trendDirection = (signal: ContextualizedSignal): Trend['direction']['direction'] | undefined =>
  ifElse(
    (candidate: Trend | undefined): candidate is Trend => candidate !== undefined,
    candidate => candidate.direction.direction,
    () => undefined,
  )(unwrap(signal.trend))

const isSupportingInventory = (signal: ContextualizedSignal, condition: AnalysisCondition): boolean =>
  cond<[], boolean>([
    [() => condition.condition === 'Tightening', () => trendDirection(signal) === 'Down'],
    [() => condition.condition === 'Loosening', () => trendDirection(signal) === 'Up'],
    [() => condition.condition === 'Balanced', () => trendDirection(signal) === 'Flat'],
    [() => true, () => false],
  ])()

const isSupportingPrice = (signal: ContextualizedSignal, condition: AnalysisCondition): boolean =>
  cond<[], boolean>([
    [() => condition.condition === 'Tightening', () => trendDirection(signal) === 'Up'],
    [() => condition.condition === 'Loosening', () => trendDirection(signal) === 'Down'],
    [() => condition.condition === 'Balanced', () => trendDirection(signal) === 'Flat'],
    [() => true, () => false],
  ])()

const isContradictoryInventory = (signal: ContextualizedSignal, condition: AnalysisCondition): boolean =>
  cond<[], boolean>([
    [() => condition.condition === 'Tightening', () => trendDirection(signal) === 'Up'],
    [() => condition.condition === 'Loosening', () => trendDirection(signal) === 'Down'],
    [() => condition.condition === 'Balanced', () => anyPass([() => trendDirection(signal) === 'Up', () => trendDirection(signal) === 'Down'])()],
    [() => condition.condition === 'Mixed', () => anyPass([() => trendDirection(signal) === 'Up', () => trendDirection(signal) === 'Down'])()],
    [() => true, () => false],
  ])()

const isContradictoryPrice = (signal: ContextualizedSignal, condition: AnalysisCondition): boolean =>
  cond<[], boolean>([
    [() => condition.condition === 'Tightening', () => trendDirection(signal) === 'Down'],
    [() => condition.condition === 'Loosening', () => trendDirection(signal) === 'Up'],
    [() => condition.condition === 'Balanced', () => anyPass([() => trendDirection(signal) === 'Up', () => trendDirection(signal) === 'Down'])()],
    [() => condition.condition === 'Mixed', () => anyPass([() => trendDirection(signal) === 'Up', () => trendDirection(signal) === 'Down'])()],
    [() => true, () => false],
  ])()

const supportsCondition = (signal: ContextualizedSignal, condition: AnalysisCondition): boolean =>
  ifElse(
    (candidate: ContextualizedSignal) => candidate.signal.identity.kind === 'Inventory',
    candidate => isSupportingInventory(candidate, condition),
    candidate => isSupportingPrice(candidate, condition),
  )(signal)

const contradictsCondition = (signal: ContextualizedSignal, condition: AnalysisCondition): boolean =>
  ifElse(
    (candidate: ContextualizedSignal) => candidate.signal.identity.kind === 'Inventory',
    candidate => isContradictoryInventory(candidate, condition),
    candidate => isContradictoryPrice(candidate, condition),
  )(signal)

const conditionFromState = (state: SystemBalanceState): AnalysisCondition =>
  createAnalysisCondition(
    cond<[], AnalysisCondition['condition']>([
      [() => state === 'Tightening', () => 'Tightening'],
      [() => state === 'Loosening', () => 'Loosening'],
      [() => state === 'Balanced', () => 'Balanced'],
      [() => state === 'Mixed', () => 'Mixed'],
      [() => true, () => 'Unknown'],
    ])(),
  )

const resolveConditionForState = (state: SystemBalanceState, alignment: AnalysisSignalAlignment): AnalysisCondition =>
  ifElse(
    () => isContradictoryAlignment(state, alignment),
    () => createAnalysisCondition('Mixed'),
    () => conditionFromState(state),
  )()

const isContradictoryAlignment = (state: SystemBalanceState, alignment: AnalysisSignalAlignment): boolean =>
  cond<[SystemBalanceState], boolean>([
    [value => value === 'Tightening', () => anyPass([() => alignment.alignment === 'AlignedLoosening', () => alignment.alignment === 'Mixed'])()],
    [value => value === 'Loosening', () => anyPass([() => alignment.alignment === 'AlignedTightening', () => alignment.alignment === 'Mixed'])()],
    [value => value === 'Balanced', () => alignment.alignment !== 'Insufficient'],
    [value => value === 'Mixed', () => true],
    [() => true, () => false],
  ])(state)

export const determineFullAnalysisCondition = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  alignment: AnalysisSignalAlignment,
  _policies: FullAnalysisPolicies,
): Result<AnalysisCondition, AnalysisError> =>
  cond<[SystemBalanceState], Result<AnalysisCondition, AnalysisError>>([
    [value => value === 'Tightening', () => success(resolveConditionForState('Tightening', alignment))],
    [value => value === 'Loosening', () => success(resolveConditionForState('Loosening', alignment))],
    [value => value === 'Balanced', () => success(resolveConditionForState('Balanced', alignment))],
    [value => value === 'Mixed', () => success(resolveConditionForState('Mixed', alignment))],
    [value => value === 'Unknown', () => success(resolveConditionForState('Unknown', alignment))],
    [() => true, value => failure(makeUnsupportedBalanceStateError(value))],
  ])(systemBalanceAnalysis.balanceState)

const prioritizeDrivers = (drivers: readonly BalanceDriver[], policy: FullAnalysisPolicies['drivers']): readonly BalanceDriver[] =>
  pipe(
    sortBy((driver: BalanceDriver) => policy.priorityKinds.findIndex(kind => kind === driver.kind)),
    (sorted: readonly BalanceDriver[]) => sorted.slice(0, policy.maximumCount),
  )(drivers)

export const selectFullAnalysisDrivers = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  policies: FullAnalysisPolicies,
): Result<readonly BalanceDriver[], AnalysisError> =>
  ifElse(
    (candidate: readonly BalanceDriver[]) => candidate.length > 0,
    candidate => success(prioritizeDrivers(candidate, policies.drivers)),
    () => failure(makeUnableToSelectKeyDriversError('system balance analysis did not expose any drivers')),
  )(systemBalanceAnalysis.drivers)

const historicalQualificationSignals = (
  signals: AnalysisKeySignals,
  policies: FullAnalysisPolicies,
): readonly ContextualizedSignal[] => [signals.inventory, signals.price].slice(0, policies.historicalQualifications.maximumCount)

export const classifyFullAnalysisSupportingSignals = (
  signals: AnalysisKeySignals,
  condition: AnalysisCondition,
): readonly ContextualizedSignal[] => [signals.inventory, signals.price].filter(signal => supportsCondition(signal, condition))

export const classifyFullAnalysisContradictorySignals = (
  signals: AnalysisKeySignals,
  condition: AnalysisCondition,
): readonly ContextualizedSignal[] => [signals.inventory, signals.price].filter(signal => contradictsCondition(signal, condition))

const hasPartialInterpretation = (signals: AnalysisKeySignals): boolean =>
  anyPass([
    (candidate: AnalysisKeySignals) => candidate.inventory.caveats.length > 0,
    (candidate: AnalysisKeySignals) => candidate.price.caveats.length > 0,
  ])(signals)

const toPropagatedAnalysisCaveats = (signals: AnalysisKeySignals): readonly AnalysisCaveat[] => [
  ...signals.inventory.caveats.map(createPropagatedInterpretationCaveat),
  ...signals.price.caveats.map(createPropagatedInterpretationCaveat),
]

const toPropagatedSystemBalanceCaveats = (systemBalanceAnalysis: SystemBalanceAnalysis): readonly AnalysisCaveat[] =>
  systemBalanceAnalysis.caveats.map(createPropagatedSystemBalanceCaveat)

export const composeFullAnalysisCaveats = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  signals: AnalysisKeySignals,
  condition: AnalysisCondition,
  supportingSignals: readonly ContextualizedSignal[],
  contradictorySignals: readonly ContextualizedSignal[],
  confidence: AnalysisConfidence,
): readonly AnalysisCaveat[] => {
  const partial = ifElse(
    () => hasPartialInterpretation(signals),
    () => [createPartialInterpretationCaveat('one or more contextualized signals were partial')],
    () => [],
  )()

  const mixed = ifElse(
    () => condition.condition === 'Mixed',
    () => [createMixedEvidenceCaveat('physical balance and signal context conflict')],
    () => [],
  )()

  const priceContradiction = ifElse(
    () => contradictorySignals.some(signal => signal.signal.identity.kind === 'Price'),
    () => [createPriceContradictionCaveat('price context contradicted the physical balance read')],
    () => [],
  )()

  const lowConfidence = ifElse(
    anyPass([
      () => confidence.confidence === 'Low',
      () => confidence.confidence === 'Unknown',
    ]),
    () => [createLowConfidenceCaveat('analysis confidence remained conservative')],
    () => [],
  )()

  return [
    ...toPropagatedSystemBalanceCaveats(systemBalanceAnalysis),
    ...toPropagatedAnalysisCaveats(signals),
    ...partial,
    ...mixed,
    ...priceContradiction,
    ...lowConfidence,
  ]
}

const lowerConfidence = (confidence: AnalysisConfidence['confidence']): AnalysisConfidence['confidence'] =>
  cond<[AnalysisConfidence['confidence']], AnalysisConfidence['confidence']>([
    [value => value === 'High', () => 'Medium'],
    [value => value === 'Medium', () => 'Low'],
    [value => value === 'Low', () => 'Unknown'],
    [() => true, () => 'Unknown'],
  ])(confidence)

export const assignFullAnalysisConfidence = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  condition: AnalysisCondition,
  supportingSignals: readonly ContextualizedSignal[],
  contradictorySignals: readonly ContextualizedSignal[],
  policies: FullAnalysisPolicies,
): AnalysisConfidence => {
  const baseConfidence = policies.confidence.balanceStateConfidence[systemBalanceAnalysis.balanceState]
  const contradictionExists = anyPass([
    () => contradictorySignals.length > 0,
    () => condition.condition === 'Mixed',
  ])()
  const partialExists = supportingSignals.some(signal => signal.caveats.length > 0)

  const degraded = ifElse(
    () => anyPass([() => contradictionExists, () => partialExists])(),
    () => lowerConfidence(baseConfidence),
    () => baseConfidence,
  )()

  return createAnalysisConfidence(degraded)
}

const conditionLabel = (condition: AnalysisCondition): string => condition.condition

const driverPhrase = (driver: BalanceDriver): string => driver.kind

const describeDrivers = (drivers: readonly BalanceDriver[]): string =>
  ifElse(
    (candidate: readonly BalanceDriver[]) => candidate.length > 0,
    candidate => candidate.map(driverPhrase).join(', '),
    () => 'limited clear drivers',
  )(drivers)

const describeSignals = (signals: readonly ContextualizedSignal[]): string =>
  ifElse(
    (candidate: readonly ContextualizedSignal[]) => candidate.length > 0,
    candidate => candidate.map(signal => signal.signal.identity.kind).join(', '),
    () => 'no selected signals',
  )(signals)

const validateNarrative = (
  text: string,
  policies: FullAnalysisPolicies,
  field: 'headline' | 'summary' | 'explanation',
): Result<string, AnalysisError> => {
  const lowerText = text.toLowerCase()
  const forbiddenPhrase = policies.forbiddenNarrativePhrases.find(phrase => lowerText.includes(phrase.toLowerCase()))
  const isValidText = allPass([
    isNonEmptyString,
    () => forbiddenPhrase === undefined,
  ])

  return ifElse(
    () => isValidText(text),
    () => success(text),
    () => failure(makeUnableToComposeFullAnalysisError(`${field} was not acceptable`)),
  )()
}

export const buildFullAnalysisHeadline = (
  condition: AnalysisCondition,
  drivers: readonly BalanceDriver[],
  policies: FullAnalysisPolicies,
): Result<string, AnalysisError> =>
  validateNarrative(
    `${conditionLabel(condition)} weekly read driven by ${describeDrivers(drivers)}.`,
    policies,
    'headline',
  )

export const buildFullAnalysisSummary = (
  condition: AnalysisCondition,
  supportingSignals: readonly ContextualizedSignal[],
  contradictorySignals: readonly ContextualizedSignal[],
  caveats: readonly AnalysisCaveat[],
  policies: FullAnalysisPolicies,
): Result<string, AnalysisError> =>
  validateNarrative(
    `${conditionLabel(condition)} weekly read from ${describeSignals(supportingSignals)} with ${String(contradictorySignals.length)} contradictory signal(s) and ${String(caveats.length)} caveat(s).`,
    policies,
    'summary',
  )

export const buildFullAnalysisExplanation = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  condition: AnalysisCondition,
  signals: AnalysisKeySignals,
  supportingSignals: readonly ContextualizedSignal[],
  contradictorySignals: readonly ContextualizedSignal[],
  qualifications: readonly ContextualizedSignal[],
  caveats: readonly AnalysisCaveat[],
  policies: FullAnalysisPolicies,
): Result<string, AnalysisError> =>
  validateNarrative(
    `System balance is ${systemBalanceAnalysis.balanceState.toLowerCase()} and the weekly condition is ${conditionLabel(condition)}. Key signals are ${describeSignals([signals.inventory, signals.price])}. Historical qualifications are ${describeSignals(qualifications)}. Supporting signals: ${describeSignals(supportingSignals)}. Contradictory signals: ${describeSignals(contradictorySignals)}. Caveats: ${String(caveats.length)}.`,
    policies,
    'explanation',
  )

const buildConditionContext = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  signals: AnalysisKeySignals,
  alignment: AnalysisSignalAlignment,
  policies: FullAnalysisPolicies,
): Result<FullAnalysisCompositionWithCondition, AnalysisError> =>
  bindResult(
    determineFullAnalysisCondition(systemBalanceAnalysis, alignment, policies),
    condition => success({ systemBalanceAnalysis, keySignals: signals, alignment, validatedPolicies: policies, condition }),
  )

const buildDriversContext = (
  context: FullAnalysisCompositionWithCondition,
): Result<FullAnalysisCompositionWithDrivers, AnalysisError> =>
  mapResult(selectFullAnalysisDrivers(context.systemBalanceAnalysis, context.validatedPolicies), keyDrivers => ({ ...context, keyDrivers }))

const buildSignalClassificationContext = (
  context: FullAnalysisCompositionWithDrivers,
): Result<FullAnalysisCompositionWithSignalClassification, AnalysisError> => {
  const supportingSignals = classifyFullAnalysisSupportingSignals(context.keySignals, context.condition)
  const contradictorySignals = classifyFullAnalysisContradictorySignals(context.keySignals, context.condition)

  return success({ ...context, supportingSignals, contradictorySignals })
}

const buildQualificationsContext = (
  context: FullAnalysisCompositionWithSignalClassification,
): Result<FullAnalysisCompositionWithQualifications, AnalysisError> =>
  success({
    ...context,
    historicalQualifications: historicalQualificationSignals(context.keySignals, context.validatedPolicies),
  })

const buildCaveatsContext = (
  context: FullAnalysisCompositionWithQualifications,
): Result<FullAnalysisCompositionWithCaveats, AnalysisError> =>
  success({
    ...context,
    caveats: composeFullAnalysisCaveats(
      context.systemBalanceAnalysis,
      context.keySignals,
      context.condition,
      context.supportingSignals,
      context.contradictorySignals,
      assignFullAnalysisConfidence(
        context.systemBalanceAnalysis,
        context.condition,
        context.supportingSignals,
        context.contradictorySignals,
        context.validatedPolicies,
      ),
    ),
  })

const buildConfidenceContext = (
  context: FullAnalysisCompositionWithCaveats,
): Result<FullAnalysisCompositionWithConfidence, AnalysisError> => {
  const confidence = assignFullAnalysisConfidence(
    context.systemBalanceAnalysis,
    context.condition,
    context.supportingSignals,
    context.contradictorySignals,
    context.validatedPolicies,
  )

  return success({ ...context, confidence })
}

const buildNarrativeContext = (
  context: FullAnalysisCompositionWithConfidence,
): Result<FullAnalysisCompositionWithNarrative, AnalysisError> => {
  const headline = buildFullAnalysisHeadline(context.condition, context.keyDrivers, context.validatedPolicies)
  const summary = buildFullAnalysisSummary(context.condition, context.supportingSignals, context.contradictorySignals, context.caveats, context.validatedPolicies)
  const explanation = buildFullAnalysisExplanation(
    context.systemBalanceAnalysis,
    context.condition,
    context.keySignals,
    context.supportingSignals,
    context.contradictorySignals,
    context.historicalQualifications,
    context.caveats,
    context.validatedPolicies,
  )

  return combineResults(headline, combineResults(summary, explanation, (summaryValue, explanationValue) => ({ summaryValue, explanationValue })), (headlineValue, output) => ({
    ...context,
    headline: headlineValue,
    summary: output.summaryValue,
    explanation: output.explanationValue,
  }))
}

const finalizeFullAnalysis = (context: FullAnalysisCompositionWithNarrative): WeeklyAnalysis =>
  createFullWeeklyAnalysis(
    context.systemBalanceAnalysis.reportWeek,
    context.systemBalanceAnalysis.geography,
    context.condition,
    context.headline,
    context.summary,
    context.explanation,
    context.keySignals,
    context.supportingSignals,
    context.contradictorySignals,
    context.caveats,
    context.confidence,
    context.alignment,
    context.keyDrivers,
    context.historicalQualifications,
    some({
      systemBalanceAnalysis: context.systemBalanceAnalysis,
      contextualizedSignals: context.keySignals,
    } satisfies AnalysisTrace),
  )

export const composeFullWeeklyAnalysis = (
  systemBalanceAnalysis: SystemBalanceAnalysis,
  signals: Partial<ContextualizedSignalSet>,
  policies: FullAnalysisPolicies,
): Result<WeeklyAnalysis, AnalysisError> => {
  const addSelectedSignals = (validatedPolicies: FullAnalysisPolicies) =>
    mapResult(selectFullAnalysisSignals(signals), keySignals => ({ systemBalanceAnalysis, keySignals, validatedPolicies }))

  const addAlignment = (context: FullAnalysisCompositionStart): Result<FullAnalysisCompositionStart, AnalysisError> =>
    mapResult(classifyCoreWeeklySignalAlignment(context.keySignals), alignment => ({ ...context, alignment }))

  const addCondition = (context: FullAnalysisCompositionStart): Result<FullAnalysisCompositionWithCondition, AnalysisError> =>
    buildConditionContext(context.systemBalanceAnalysis, context.keySignals, context.alignment, context.validatedPolicies)

  const addDrivers = (context: FullAnalysisCompositionWithCondition): Result<FullAnalysisCompositionWithDrivers, AnalysisError> =>
    buildDriversContext(context)

  const addSignalClassification = (context: FullAnalysisCompositionWithDrivers): Result<FullAnalysisCompositionWithSignalClassification, AnalysisError> =>
    buildSignalClassificationContext(context)

  const addQualifications = (context: FullAnalysisCompositionWithSignalClassification): Result<FullAnalysisCompositionWithQualifications, AnalysisError> =>
    buildQualificationsContext(context)

  const addCaveats = (context: FullAnalysisCompositionWithQualifications): Result<FullAnalysisCompositionWithCaveats, AnalysisError> =>
    buildCaveatsContext(context)

  const addConfidence = (context: FullAnalysisCompositionWithCaveats): Result<FullAnalysisCompositionWithConfidence, AnalysisError> =>
    buildConfidenceContext(context)

  const addNarrative = (context: FullAnalysisCompositionWithConfidence): Result<FullAnalysisCompositionWithNarrative, AnalysisError> =>
    buildNarrativeContext(context)

  const finalize = (context: FullAnalysisCompositionWithNarrative): Result<WeeklyAnalysis, AnalysisError> =>
    success(finalizeFullAnalysis(context))

  const pipeline = pipeWith(bindResultStep, [
    validateFullAnalysisPolicies,
    addSelectedSignals,
    addAlignment,
    addCondition,
    addDrivers,
    addSignalClassification,
    addQualifications,
    addCaveats,
    addConfidence,
    addNarrative,
    finalize,
  ])

  return pipeline(policies)
}