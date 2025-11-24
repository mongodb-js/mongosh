export type PickMethodsByReturnType<T, R> = {
  [k in keyof T as NonNullable<T[k]> extends (...args: any[]) => R
    ? k
    : never]: T[k];
};
