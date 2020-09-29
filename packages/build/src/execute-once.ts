import Platform from './platform';

// Makes sure task is executed only once for all given platforms.
// cb is a function to be executed.
export default function runOnlyOnOnePlatform(codeSectionLabel, config, cb: Function): any {
  // Since evergreen runs everything with a matrix strategy we
  // have to run the parts of the code that can't run more than once
  // only on the mac os runner.

  const platformForSingleRun = Platform.MacOs;

  if (config.platform === platformForSingleRun) {
    console.info(
      'mongosh: running', codeSectionLabel,
      'since platform ===', platformForSingleRun
    );

    return cb();
  }

  console.info(
    'mongosh: skipping', codeSectionLabel,
    'since platform !==', platformForSingleRun
  );

  return;
}
