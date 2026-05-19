export const isNonEmptyArray = <Item>(
  values: readonly Item[],
): values is readonly [Item, ...Item[]] => values.length > 0

export const firstArrayItem = <Item>(values: readonly [Item, ...Item[]]): Item => values[0]
