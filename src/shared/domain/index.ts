export type DomainConstructionError = Readonly<{
  readonly kind: string
  readonly input: string
}>

export const makeDomainConstructionError = (kind: string, input: unknown): DomainConstructionError => ({
  kind,
  input: String(input),
})

import { allPass, ifElse } from '@/shared/fp'

const isObjectInput = (input: unknown): input is object => input instanceof Object
const hasKindProp = (candidate: object): boolean => typeof Reflect.get(candidate, 'kind') === 'string'
const hasInputProp = (candidate: object): boolean => typeof Reflect.get(candidate, 'input') === 'string'

export const isDomainConstructionError = (candidate: unknown): candidate is DomainConstructionError =>
  ifElse(
    isObjectInput,
    allPass([hasKindProp, hasInputProp]),
    () => false,
  )(candidate)
