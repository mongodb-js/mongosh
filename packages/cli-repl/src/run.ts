let fipsError: Error | undefined;
if (process.argv.includes('--tlsFIPSMode')) {
  // FIPS mode should be enabled before we run any other code, including any dependencies.
  try {
    require('crypto').setFips(1);
  } catch (err: any) {
    fipsError = err;
  }
}

import { buildInfo } from './build-info';
import { runMain } from 'module';
import crypto from 'crypto';
import net from 'net';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  if (process.env.MONGOSH_RUN_NODE_SCRIPT) {
    // For uncompiled mongosh: node /path/to/this/file script ... -> node script ...
    // FOr compiled mongosh: mongosh mongosh script ... -> mongosh script ...
    process.argv.splice(1, 1);
    (runMain as any)(process.argv[1]);
    return;
  }

  let repl;
  let isSingleConsoleProcess = false;
  try {
    const { parseCliArgs } = await import('./arg-parser');
    const { generateConnectionInfoFromCliArgs } = await import(
      '@mongosh/arg-parser'
    );
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
      const { USAGE } = await import('./constants');
      console.log(USAGE);
      return;
    }

    if (options.version) {
      console.log((await buildInfo()).version);
      return;
    }
    if (options.buildInfo) {
      console.log(JSON.stringify(await buildInfo(), null, '  '));
      return;
    }
    if (options.smokeTests) {
      const { runSmokeTests } = await import('./smoke-tests');
      const smokeTestServer = process.env.MONGOSH_SMOKE_TEST_SERVER;
      const cryptLibraryOpts = options.cryptSharedLibPath
        ? [`--cryptSharedLibPath=${options.cryptSharedLibPath}`]
        : [];
      if (process.execPath === process.argv[1]) {
        // This is the compiled binary. Use only the path to it.
        await runSmokeTests(
          smokeTestServer,
          process.execPath,
          ...cryptLibraryOpts
        );
      } else {
        // This is not the compiled binary. Use node + this script.
        await runSmokeTests(
          smokeTestServer,
          process.execPath,
          process.argv[1],
          ...cryptLibraryOpts
        );
      }
      return;
    }

    // Common case: We want to actually start as mongosh.
    // We lazy-load the larger dependencies here to speed up startup in the
    // less common cases (particularly because the cloud team wants --version
    // to be fast).
    // Note that when we add snapshot support, we will most likely have
    // to move these back to be import statements at the top of the file.
    // See https://jira.mongodb.org/browse/MONGOSH-1214 for some context.
    const [
      { CliRepl },
      { getStoragePaths, getGlobalConfigPaths },
      { getCryptLibraryPaths },
      { getTlsCertificateSelector },
      { redactURICredentials },
    ] = await Promise.all([
      await import('./cli-repl'),
      await import('./config-directory'),
      await import('./crypt-library-paths'),
      await import('./tls-certificate-selector'),
      await import('@mongosh/history'),
    ]);

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
      onExit: process.exit,
      shellHomePaths: shellHomePaths,
      globalConfigPaths: globalConfigPaths,
    });
    await repl.start(connectionInfo.connectionString, {
      productName: 'MongoDB Shell',
      productDocsLink: 'https://www.mongodb.com/docs/mongodb-shell/',
      ...connectionInfo.driverOptions,
    });
  } catch (e: any) {
    console.error(`${e?.name}: ${e?.message}`);
    if (repl !== undefined) {
      repl.bus.emit('mongosh:error', e, 'startup');
    }
    if (isSingleConsoleProcess) {
      const askcharacter = (await import('askcharacter')).default;
      // In single-process-console mode, it's confusing for the window to be
      // closed immediately after receiving an error. In that case, ask the
      // user to explicitly close the window.
      process.stdout.write('Press any key to exit: ');
      await askcharacter({ input: process.stdin, output: process.stdout });
      process.stdout.write('\n');
    }
    process.exit(1);
  }
})();

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
  const { createInterface } = await import('readline');
  const { PassThrough } = await import('stream');

  // Copy stdin to a second stream so that we can still attach it
  // to the main mongosh REPL instance later without conflicts.
  const stdinCopy = process.stdin.pipe(new PassThrough());
  try {
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
