export type DomainConstructionError = Readonly<{
  readonly kind: string
  readonly input: string
}>

export const makeDomainConstructionError = (kind: string, input: unknown): DomainConstructionError => ({
  kind,
  input: String(input),
})

import { allPass, ifElse } from '@/shared/fp'

export const isObjectInput = (input: unknown): input is object => input instanceof Object
export const isStringInput = (input: unknown): input is string => typeof input === 'string'

export const hasBrand = (brand: symbol) => (candidate: object): boolean =>
  Reflect.get(candidate, brand) === true

// Helper: generate per-brand factories that create properly typed, branded values.
// Usage: const createX = makeBrandedFactory<LabelType, typeof brand>(brand)
export const brand = (b: symbol) => ({ [b]: true })


const hasKindProp = (candidate: object): boolean => typeof Reflect.get(candidate, 'kind') === 'string'
const hasInputProp = (candidate: object): boolean => typeof Reflect.get(candidate, 'input') === 'string'

export const isDomainConstructionError = (candidate: unknown): candidate is DomainConstructionError =>
  ifElse(
    isObjectInput,
    allPass([hasKindProp, hasInputProp]),
    () => false,
  )(candidate)
