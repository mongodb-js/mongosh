// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type TNodeFetch = typeof import('node-fetch');
export type { Request, Response, RequestInfo, RequestInit } from 'node-fetch';

declare const __webpack_require__: unknown;

export default async function importNodeFetch(): Promise<TNodeFetch> {
  // Node-fetch is an ESM module from 3.x
  // Importing ESM modules to CommonJS is possible with a dynamic import.
  // However, once this is transpiled with TS, `await import()` changes to `require()`, which fails to load
  // the package at runtime.
  // The alternative, to transpile with "moduleResolution": "NodeNext", is not always feasible.
  // Use this function to safely import the node-fetch package
  let module;
  try {
    module = await import('node-fetch');
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'ERR_REQUIRE_ESM' &&
      typeof __webpack_require__ === 'undefined'
    ) {
      // This means that the import() above was transpiled to require()
      // and that that require() called failed because it saw actual on-disk ESM.
      // In this case, it should be safe to use eval'ed import().
      module = await eval(`import('node-fetch')`);
    } else {
      throw err;
    }
  }

  return module;
}
