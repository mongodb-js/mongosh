import { CliRepl, parseCliArgs, mapCliToDriver, getStoragePaths, getMongocryptdPath, runSmokeTests, USAGE } from './index';
import { generateUri } from '@mongosh/service-provider-server';

(async() => {
  let repl;
  try {
    const options = parseCliArgs(process.argv);
    const { version } = require('../package.json');

    if (options.help) {
      // eslint-disable-next-line no-console
      console.log(USAGE);
    } else if (options.version) {
      // eslint-disable-next-line no-console
      console.log(version);
    } else if (options.smokeTests) {
      await runSmokeTests(process.execPath);
    } else {
      let mongocryptdSpawnPath = null;
      if (process.execPath === process.argv[1]) {
        // Remove the built-in Node.js listener that prints e.g. deprecation
        // warnings in single-binary release mode.
        process.removeAllListeners('warning');
        // Look for mongocryptd in the locations where our packaging would
        // have put it.
        mongocryptdSpawnPath = await getMongocryptdPath();
      }

      // This is for testing under coverage, see the the comment in the tests
      if (process.env.CLEAR_SIGINT_LISTENERS) {
        process.removeAllListeners('SIGINT');
      }

      process.title = 'mongosh';
      const driverOptions = await mapCliToDriver(options);
      const driverUri = generateUri(options);
      const appname = `${process.title} ${version}`;
      const shellHomePaths = getStoragePaths();
      repl = new CliRepl({
        shellCliOptions: {
          ...options,
          ...(mongocryptdSpawnPath ? { mongocryptdSpawnPath } : {})
        },
        input: process.stdin,
        output: process.stdout,
        onExit: process.exit,
        shellHomePaths: shellHomePaths
      });
      await repl.start(driverUri, { appName: appname, ...driverOptions });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`${e.name}: ${e.message}`);
    if (repl !== undefined) {
      repl.bus.emit('mongosh:error', e);
    }
    process.exit(1);
  }
})();
