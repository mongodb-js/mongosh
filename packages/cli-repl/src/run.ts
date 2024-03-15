let fipsError: Error | undefined;
function enableFipsIfRequested() {
  if (process.argv.includes('--tlsFIPSMode')) {
    // FIPS mode should be enabled before we run any other code, including any dependencies.
    // We still wrap this into a function so we can also call it immediately after
    // entering the snapshot main function.
    try {
      require('crypto').setFips(1);
    } catch (err: any) {
      fipsError ??= err;
    }
  }
}
enableFipsIfRequested();

import { markTime } from './startup-timing';
import { CliRepl } from './cli-repl';
import { parseCliArgs } from './arg-parser';
import { runSmokeTests } from './smoke-tests';
import { USAGE } from './constants';
import { baseBuildInfo, buildInfo } from './build-info';
import { getStoragePaths, getGlobalConfigPaths } from './config-directory';
import { getCryptLibraryPaths } from './crypt-library-paths';
import { getTlsCertificateSelector } from './tls-certificate-selector';
import { redactURICredentials } from '@mongosh/history';
import { generateConnectionInfoFromCliArgs } from '@mongosh/arg-parser';
import askcharacter from 'askcharacter';
import { PassThrough } from 'stream';
import crypto from 'crypto';
import net from 'net';
import v8 from 'v8';
import { TimingCategories } from '@mongosh/types';

// TS does not yet have type definitions for v8.startupSnapshot
if ((v8 as any)?.startupSnapshot?.isBuildingSnapshot?.()) {
  // Import a few nested deps of dependencies that cannot be included in the
  // primary snapshot eagerly.
  require('@mongodb-js/saslprep'); // Driver dependency
  require('socks'); // Driver dependency
  require('emphasize'); // Dependency of pretty-repl
  require('ipv6-normalize'); // Dependency of devtools-connect via os-dns-native
  require('bindings'); // Used by various native dependencies but not a native dep itself

  {
    const console = require('console');
    const ConsoleCtor = console.Console;
    (v8 as any).startupSnapshot.addDeserializeCallback(() => {
      console.Console = ConsoleCtor;
      // Work around Node.js caching the cwd when snapshotting
      // https://github.com/nodejs/node/pull/51901
      process.chdir('.');
    });
  }

  (v8 as any).startupSnapshot.setDeserializeMainFunction(() => {
    enableFipsIfRequested();
    markTime(TimingCategories.Snapshot, 'loaded pre-snapshot deps');

    void main();
  });
} else {
  void main();
}

// eslint-disable-next-line complexity
async function main() {
  markTime(TimingCategories.Main, 'entered main');
  if (process.env.MONGOSH_RUN_NODE_SCRIPT) {
    // For uncompiled mongosh: node /path/to/this/file script ... -> node script ...
    // FOr compiled mongosh: mongosh mongosh script ... -> mongosh script ...
    process.argv.splice(1, 1);
    // 'module' is not supported in startup snapshots yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (require('module').runMain as any)(process.argv[1]);
    return;
  }

  let repl;
  let isSingleConsoleProcess = false;
  try {
    (net as any)?.setDefaultAutoSelectFamily?.(true);

    const options = parseCliArgs(process.argv);
    for (const warning of options._argParseWarnings) {
      console.warn(warning);
    }

    const { version } = require('../package.json');

    if (options.tlsFIPSMode) {
      if (!fipsError && !crypto.getFips()) {
        // We can end up here if somebody used an unsual spelling of
        // --tlsFIPSMode that our arg parser recognizes, but not the
        // early check above, e.g. --tls-FIPS-mode.
        // We should also just generally check that FIPS mode is
        // actually enabled.
        fipsError = new Error('FIPS mode not enabled despite requested');
      }
      if (fipsError) {
        // Adjust the error message depending on whether this mongosh binary
        // potentially can support FIPS or not.
        if (process.config.variables.node_shared_openssl) {
          console.error(
            'Could not enable FIPS mode. Please ensure that your system OpenSSL installation'
          );
          console.error(
            'supports FIPS, and see the mongosh FIPS documentation for more information.'
          );
        } else {
          console.error(
            'Could not enable FIPS mode. This mongosh installation does not appear to'
          );
          console.error(
            'support FIPS. Please see the mongosh FIPS documentation for more information.'
          );
        }
        console.error('Error details:');
        console.error(fipsError);
        process.exit(1);
      }
    }

    if (options.help) {
      console.log(USAGE);
      return;
    }

    if (options.version) {
      console.log(baseBuildInfo().version);
      return;
    }
    if (options.buildInfo) {
      console.log(JSON.stringify(await buildInfo(), null, '  '));
      return;
    }
    if (options.smokeTests || options.perfTests) {
      const smokeTestServer = process.env.MONGOSH_SMOKE_TEST_SERVER;
      const cryptLibraryOpts = options.cryptSharedLibPath
        ? [`--cryptSharedLibPath=${options.cryptSharedLibPath}`]
        : [];
      if (process.execPath === process.argv[1]) {
        // This is the compiled binary. Use only the path to it.
        await runSmokeTests({
          smokeTestServer,
          args: [process.execPath, ...cryptLibraryOpts],
          wantPerformanceTesting: !!options.perfTests,
        });
      } else {
        // This is not the compiled binary. Use node + this script.
        await runSmokeTests({
          smokeTestServer,
          args: [process.execPath, process.argv[1], ...cryptLibraryOpts],
          wantPerformanceTesting: !!options.perfTests,
        });
      }
      return;
    }

    if (process.execPath === process.argv[1]) {
      // Remove the built-in Node.js listener that prints e.g. deprecation
      // warnings in single-binary release mode.
      process.removeAllListeners('warning');
    }

    // This is for testing under coverage, see the the comment in the tests
    if (process.env.CLEAR_SIGINT_LISTENERS) {
      process.removeAllListeners('SIGINT');
    }

    // If we are spawned via Windows doubleclick, ask the user for an URI to
    // connect to. Allow an environment variable to override this for testing.
    isSingleConsoleProcess =
      !!process.env.MONGOSH_FORCE_CONNECTION_STRING_PROMPT;
    if (
      (!options.connectionSpecifier &&
        process.platform === 'win32' &&
        process.stdin.isTTY &&
        process.stdout.isTTY) ||
      isSingleConsoleProcess
    ) {
      try {
        isSingleConsoleProcess ||=
          require('get-console-process-list')().length === 1;
      } catch {
        /* ignore */
      }
      if (isSingleConsoleProcess) {
        const result = await ask(
          'Please enter a MongoDB connection string (Default: mongodb://localhost/): '
        );
        if (result.trim() !== '') {
          options.connectionSpecifier = result.trim();
        }
      }
    }

    const connectionInfo = generateConnectionInfoFromCliArgs(options);
    connectionInfo.driverOptions = {
      ...connectionInfo.driverOptions,
      ...getTlsCertificateSelector(options.tlsCertificateSelector),
      driverInfo: { name: 'mongosh', version },
    };

    const title = `mongosh ${redactURICredentials(
      connectionInfo.connectionString
    )}`;
    process.title = title;
    setTerminalWindowTitle(title);

    const shellHomePaths = getStoragePaths();
    const globalConfigPaths = getGlobalConfigPaths();
    repl = new CliRepl({
      shellCliOptions: {
        ...options,
      },
      getCryptLibraryPaths,
      input: process.stdin,
      output: process.stdout,
      // Node.js 20.0.0 made p.exit(undefined) behave as p.exit(0) rather than p.exit()
      onExit: (code?: number | undefined) =>
        code === undefined ? process.exit() : process.exit(code),
      shellHomePaths: shellHomePaths,
      globalConfigPaths: globalConfigPaths,
    });
    markTime(TimingCategories.REPLInstantiation, 'entering repl.start()');
    await repl.start(connectionInfo.connectionString, {
      productName: 'MongoDB Shell',
      productDocsLink: 'https://www.mongodb.com/docs/mongodb-shell/',
      ...connectionInfo.driverOptions,
    });
  } catch (e: any) {
    // for debugging
    if (process.env.MONGOSH_DISPLAY_STARTUP_STACK_TRACE)
      console.error(e?.stack);
    else console.error(`${e?.name}: ${e?.message}`);
    if (repl !== undefined) {
      repl.bus.emit('mongosh:error', e, 'startup');
    }
    if (isSingleConsoleProcess) {
      // In single-process-console mode, it's confusing for the window to be
      // closed immediately after receiving an error. In that case, ask the
      // user to explicitly close the window.
      process.stdout.write('Press any key to exit: ');
      await askcharacter({ input: process.stdin, output: process.stdout });
      process.stdout.write('\n');
    }
    process.exit(1);
  }
}

/**
 * Helper to set the window title for the terminal that stdout is
 * connected to, if any.
 *
 * @param title The terminal window title
 */
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

/**
 * Helper to wait for single-line input. Note that this only works until
 * the actual mongosh REPL instance is created and attached to process.stdin.
 *
 * @param prompt The prompt to ask for
 * @returns The written user input
 */
async function ask(prompt: string): Promise<string> {
  // Copy stdin to a second stream so that we can still attach it
  // to the main mongosh REPL instance later without conflicts.
  const stdinCopy = process.stdin.pipe(new PassThrough());
  try {
    const { createInterface } = require('readline');
    const readlineInterface = createInterface({
      input: stdinCopy,
      output: process.stdout,
      prompt,
    });
    readlineInterface.prompt();
    // for-await automatically reads input lines + closes the readline instance again
    for await (const line of readlineInterface) {
      return line;
    }
    return ''; // Unreachable
  } finally {
    process.stdin.unpipe(stdinCopy);
  }
}
