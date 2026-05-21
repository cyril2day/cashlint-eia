import { both, complement, includes, is, isEmpty, propEq } from 'ramda'

export {
	allPass,
	anyPass,
	applySpec,
	assoc,
	assocPath,
	both,
	complement,
	compose,
	cond,
	converge,
	descend,
	dissoc,
	either,
	eqBy,
	equals,
	evolve,
	filter,
	find,
	groupBy,
	has,
	hasPath,
	ifElse,
	includes,
	identity,
	is,
	isEmpty,
	isNil,
	keys,
	map,
	mapObjIndexed,
	mergeDeepLeft,
	mergeDeepRight,
	mergeLeft,
	mergeRight,
	omit,
	path,
	pathEq,
	pathOr,
	pick,
	pipe,
	pipeWith,
	pluck,
	prop,
	propEq,
	props,
	reduce,
	reject,
	sortBy,
	toPairs,
	unless,
	values,
	when,
	where,
	whereEq,
	zipObj,
} from 'ramda'

// Small named predicate helpers to make FP migrations easier.
export const isNonEmptyString = both(is(String), complement(isEmpty))

export const isSome = propEq('kind', 'Some')

export const isNone = propEq('kind', 'None')

export const isSomeOf = (values: readonly unknown[]) =>
	both(propEq('kind', 'Some'), (m: Record<string, unknown>) => includes(m['value'], values))

export const isNonEmptyMaybeString = () =>
	both(propEq('kind', 'Some'), (m: Record<string, unknown>) => isNonEmptyString(m['value']))

export const isSomeStringIn = (values: readonly string[]) =>
	both(propEq('kind', 'Some'), (m: Record<string, unknown>) => includes(m['value'], values))

export const isNonEmptyArray = () => both(is(Array), complement(isEmpty))

// Typed helper: checks for `undefined` while keeping precise generics for TS inference
export const isUndefined = <T>(v: T | undefined): v is undefined => v === undefined

