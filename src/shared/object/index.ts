import { ifElse } from '@/shared/fp'

const isObjectInput = (input: unknown): input is object => input instanceof Object

const readKeyFromObject = (key: string | symbol) => (candidate: object): unknown =>
	Object.getOwnPropertyDescriptor(candidate, key)?.value

const alwaysUndefined = (): undefined => undefined

export const getKey = (key: string | symbol) => (obj: unknown): unknown =>
	ifElse(isObjectInput, readKeyFromObject(key), alwaysUndefined)(obj)

export const hasKey = (key: string | symbol) => (obj: unknown): boolean =>
	ifElse(isObjectInput, candidate => key in candidate, () => false)(obj)
