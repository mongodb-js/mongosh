
export type UnionToIntersection<T> =
    (T extends any ? (k: T) => void : never) extends ((k: infer U) => void) ? U : never

export type PickMethodsByReturnType<T, R> = {
  [k in keyof T as NonNullable<T[k]> extends (...args: any[]) => R
    ? k
    : never]: T[k];
};
