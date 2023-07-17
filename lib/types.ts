// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tuple<T, N extends number, A extends any[] = []> = A extends {
  length: N;
}
  ? A
  : Tuple<T, N, [...A, T]>;
