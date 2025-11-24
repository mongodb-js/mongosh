import type { InspectOptions, inspect as _inspect } from 'util';

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

function customDocumentInspect(
  this: Document,
  depth: number,
  inspectOptions: InspectOptions,
  inspect: typeof _inspect
) {
  const newInspectOptions = {
    ...inspectOptions,
    depth: Infinity,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
  };

  // reuse the standard inpect logic for an object without causing infinite
  // recursion
  const copyToInspect: any = Array.isArray(this) ? this.slice() : { ...this };
  delete copyToInspect[customInspectSymbol];
  return inspect(copyToInspect, newInspectOptions);
}

export function addCustomInspect(obj: any) {
  if (Array.isArray(obj)) {
    (obj as any)[customInspectSymbol] ??= customDocumentInspect;
    for (const item of obj) {
      addCustomInspect(item);
    }
  } else if (
    obj &&
    typeof obj === 'object' &&
    obj !== null &&
    !obj._bsontype &&
    !(obj instanceof Date) &&
    !(obj instanceof RegExp)
  ) {
    obj[customInspectSymbol] = customDocumentInspect;
    for (const value of Object.values(obj)) {
      addCustomInspect(value);
    }
  }
}
