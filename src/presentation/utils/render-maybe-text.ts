import { ifElse } from '@/shared/fp'
import { type Maybe, type Some } from '@/shared/maybe'

export const renderMaybeText = (fallback: string) => (value: Maybe<string>): string =>
  ifElse(
    (candidate: Maybe<string>): candidate is Some<string> => candidate.kind === 'Some',
    (candidate: Some<string>) => candidate.value,
    () => fallback,
  )(value)