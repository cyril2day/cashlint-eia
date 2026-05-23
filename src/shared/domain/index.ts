import { allPass, ifElse } from '@/shared/fp'
import { getKey } from '@/shared/object'

export type DomainConstructionError = Readonly<{
  readonly kind: string
  readonly input: string
}>

export const makeDomainConstructionError = (kind: string, input: unknown): DomainConstructionError => ({
  kind,
  input: String(input),
})

export const isObjectInput = (input: unknown): input is object => input instanceof Object
export const isStringInput = (input: unknown): input is string => typeof input === 'string'

export const hasBrand = (brand: symbol) => (candidate: object): boolean =>
  getKey(brand)(candidate) === true

export const brand = (b: symbol) => ({ [b]: true })


const hasKindProp = allPass([
  (candidate: object) => typeof getKey('kind')(candidate) === 'string',
])

const hasInputProp = allPass([
  (candidate: object) => typeof getKey('input')(candidate) === 'string',
])

export const isDomainConstructionError = (candidate: unknown): candidate is DomainConstructionError =>
  ifElse(
    isObjectInput,
    allPass([hasKindProp, hasInputProp]),
    () => false,
  )(candidate)
