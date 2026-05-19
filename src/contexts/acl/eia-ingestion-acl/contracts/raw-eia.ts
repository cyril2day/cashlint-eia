import type { Maybe } from '@/shared/maybe'

export type PeriodCandidate = string | number
export type ValueCandidate = string | number | null
export type MaybeString = Maybe<string>

export type RawEiaRow = Readonly<{
  readonly period: Maybe<PeriodCandidate>
  readonly date: MaybeString
  readonly value: Maybe<ValueCandidate>
  readonly unit: MaybeString
  readonly series_id: MaybeString
  readonly series: MaybeString
  readonly product: MaybeString
  readonly geography: MaybeString
  readonly frequency: MaybeString
  readonly description: MaybeString
  readonly notes: MaybeString
  readonly [k: string]: unknown
}>

export type RawEiaEnvelope = Readonly<{
  readonly api: Maybe<string>
  readonly request: Maybe<unknown>
  readonly response: Maybe<unknown>
  readonly data: Maybe<readonly RawEiaRow[]>
  readonly endpoint: Maybe<string>
  readonly received_at: Maybe<string>
  readonly [k: string]: unknown
}>