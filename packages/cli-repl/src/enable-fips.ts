export let fipsError: Error | undefined;
export function enableFipsIfRequested() {
  if (process.argv.includes('--tlsFIPSMode')) {
    // FIPS mode should be enabled before we run any other code, including any dependencies.
    // We still wrap this into a function so we can also call it immediately after
    // entering the snapshot main function.
    // Similarly, this file is imported first at the very startup of mongosh, so that
    // it runs even before any other imported files have a chance to do so.
    try {
      require('crypto').setFips(1);
    } catch (err: any) {
      fipsError ??= err;
    }
  }
}
enableFipsIfRequested();
