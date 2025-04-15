import v8 from 'v8';

// Allow us to inspect the set of loaded modules at a few interesting points in time, e.g.
// startup, snapshot, and after entering VM/REPL execution mode
declare const __webpack_module_cache__: Record<string, unknown> | undefined;
declare const __webpack_modules__: Record<string, unknown> | undefined;
declare const __webpack_reverse_module_lookup__:
  | (() => Record<string | number, string>)
  | undefined;

// Return all ids of modules loaded at the current time
function enumerateLoadedModules(): (string | number)[] | null {
  if (typeof __webpack_module_cache__ !== 'undefined') {
    return Object.keys(__webpack_module_cache__);
  }
  return null;
}
// Return all ids of modules that can be loaded/are known to webpack
function enumerateAllModules(): (string | number)[] | null {
  if (typeof __webpack_modules__ !== 'undefined') {
    return Object.keys(__webpack_modules__);
  }
  return null;
}
// Perform a reverse lookup to determine the "natural" name for a given
// module id (i.e. original filename, if available).
// Calling this the first time is potentially expensive.
function lookupNaturalModuleName(id: string | number): string | null {
  let lookupTable = null;
  if (typeof __webpack_reverse_module_lookup__ !== 'undefined')
    lookupTable = __webpack_reverse_module_lookup__();
  return lookupTable?.[id] ?? null;
}
Object.defineProperty(process, '__mongosh_webpack_stats', {
  value: {
    enumerateLoadedModules,
    enumerateAllModules,
    lookupNaturalModuleName,
  },
});
if ((v8 as any)?.startupSnapshot?.isBuildingSnapshot?.()) {
  (v8 as any).startupSnapshot.addSerializeCallback(() => {
    const atSnapshotTime = enumerateLoadedModules();
    (process as any).__mongosh_webpack_stats.enumerateSnapshotModules = () =>
      atSnapshotTime;
  });
}
