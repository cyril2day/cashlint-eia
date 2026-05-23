declare module 'd3' {
  export function extent(values: readonly number[]): [number | undefined, number | undefined]

  export type LinearScale = ((value: number) => number) & {
    domain(values: readonly [number, number]): LinearScale
    range(values: readonly [number, number]): LinearScale
    ticks(count: number): readonly number[]
  }

  export function scaleLinear(): LinearScale

  export type LineGenerator<Point> = {
    x(accessor: (point: Point) => number): LineGenerator<Point>
    y(accessor: (point: Point) => number): LineGenerator<Point>
    (points: readonly Point[]): string | null
  }

  export function line<Point>(): LineGenerator<Point>
}
