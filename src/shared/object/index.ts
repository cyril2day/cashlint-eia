import { ifElse } from '@/shared/fp'

type ObjectInput = Readonly<Record<PropertyKey, unknown>>

const isObjectInput = (input: unknown): input is ObjectInput => input instanceof Object

const readKeyFromObject = (key: PropertyKey) => (candidate: ObjectInput): unknown =>
  Object.getOwnPropertyDescriptor(candidate, key)?.value

const hasOwnKeyInObject = (key: PropertyKey) => (candidate: ObjectInput): boolean =>
  Object.prototype.hasOwnProperty.call(candidate, key)

const alwaysUndefined = (): undefined => undefined
const alwaysFalse = (): false => false

export const getKey = (key: PropertyKey) => (obj: unknown): unknown =>
  ifElse(isObjectInput, readKeyFromObject(key), alwaysUndefined)(obj)

export const hasKey = (key: PropertyKey) => (obj: unknown): boolean =>
  ifElse(isObjectInput, hasOwnKeyInObject(key), alwaysFalse)(obj)
