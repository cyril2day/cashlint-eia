import { ifElse } from '@/shared/fp'

export type None = { readonly kind: 'None' }
export type Some<T> = { readonly kind: 'Some'; readonly value: T }
export type Maybe<T> = None | Some<T>

export const none = (): None => ({ kind: 'None' })

export const some = <T>(value: T): Some<T> => ({ kind: 'Some', value })

export const isSome = <T>(m: Maybe<T>): m is Some<T> => m.kind === 'Some'

export const isNone = <T>(m: Maybe<T>): m is None => m.kind === 'None'

export const map = <A, B>(fn: (a: A) => B) =>
  ifElse(
    (m: Maybe<A>): m is Some<A> => m.kind === 'Some',
    (m: Some<A>) => some(fn(m.value)),
    () => none()
  )

export default {}
