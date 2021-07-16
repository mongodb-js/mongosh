import { CliRepl, parseCliArgs, mapCliToDriver, getStoragePaths, getMongocryptdPaths, runSmokeTests, USAGE } from './index';
import { generateUri } from '@mongosh/service-provider-server';
import { redactCredentials } from '@mongosh/history';
import { runMain } from 'module';
import os from 'os';

// eslint-disable-next-line complexity
(async() => {
  if (process.env.MONGOSH_RUN_NODE_SCRIPT) {
    if (process.execPath !== process.argv[1]) {
      // node /path/to/this/file script ... -> node script ...
      process.argv.splice(1, 1);
    }
    (runMain as any)(process.argv[1]);
    return;
  }

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
    } else if (options.buildInfo) {
      try {
        const buildInfo = require('./build-info.json');
        delete buildInfo.segmentApiKey;
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(buildInfo, null, '  '));
      } catch {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
          version,
          distributionKind: 'unpackaged',
          buildArch: os.arch(),
          buildPlatform: os.platform(),
          buildTarget: 'unknown',
          buildTime: null,
          gitVersion: null
        }, null, '  '));
      }
    } else if (options.smokeTests) {
      const smokeTestServer = process.env.MONGOSH_SMOKE_TEST_SERVER;
      if (process.execPath === process.argv[1]) {
        // This is the compiled binary. Use only the path to it.
        await runSmokeTests(smokeTestServer, process.execPath);
      } else {
        // This is not the compiled binary. Use node + this script.
        await runSmokeTests(smokeTestServer, process.execPath, process.argv[1]);
      }
    } else {
      let mongocryptdSpawnPaths = [['mongocryptd']];
      if (process.execPath === process.argv[1]) {
        // Remove the built-in Node.js listener that prints e.g. deprecation
        // warnings in single-binary release mode.
        process.removeAllListeners('warning');
        // Look for mongocryptd in the locations where our packaging would
        // have put it.
        mongocryptdSpawnPaths = await getMongocryptdPaths();
      }

      // This is for testing under coverage, see the the comment in the tests
      if (process.env.CLEAR_SIGINT_LISTENERS) {
        process.removeAllListeners('SIGINT');
      }

      const driverOptions = await mapCliToDriver(options);
      const driverUri = generateUri(options);

      const title = `mongosh ${redactCredentials(driverUri)}`;
      process.title = title;
      setTerminalWindowTitle(title);

      const appName = `mongosh ${version}`;
      const shellHomePaths = getStoragePaths();
      repl = new CliRepl({
        shellCliOptions: {
          ...options,
        },
        mongocryptdSpawnPaths,
        input: process.stdin,
        output: process.stdout,
        onExit: process.exit,
        shellHomePaths: shellHomePaths
      });
      await repl.start(driverUri, { appName, ...driverOptions });
    }
  } catch (e) {
    console.error(`${e.name}: ${e.message}`);
    if (repl !== undefined) {
      repl.bus.emit('mongosh:error', e);
    }
    process.exit(1);
  }
})();

function setTerminalWindowTitle(title: string): void {
  if (!process.stdout.isTTY) {
    return;
  }

  // see: https://that.guru/blog/automatically-set-tmux-window-name/
  const term = process.env.TERM ?? '';
  if (/^(linux|xterm|rxvt)/.test(term)) {
    process.stdout.write(`\u001b]0;${title}\u0007`);
  } else if (/^screen/.test(term)) {
    process.stdout.write(`\u001bk${title}\u001b\\`);
  }
}
