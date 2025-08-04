import { MongoshInternalError } from '@mongosh/errors';
import { bson } from '@mongosh/service-provider-core';
import { once } from 'events';
import { promises as fs } from 'fs';
import type { Server as HTTPServer } from 'http';
import http, { createServer as createHTTPServer } from 'http';
import path from 'path';
import type { Duplex } from 'stream';
import { PassThrough } from 'stream';
import { promisify } from 'util';
import { eventually } from '../../../testing/eventually';
import type { MongodSetup } from '../../../testing/integration-testing-hooks';
import {
  skipIfServerVersion,
  startSharedTestServer,
  startTestServer,
} from '../../../testing/integration-testing-hooks';
import {
  expect,
  fakeTTYProps,
  readReplLogFile,
  tick,
  useTmpdir,
  waitBus,
  waitCompletion,
  waitEval,
} from '../test/repl-helpers';
import ConnectionString from 'mongodb-connection-string-url';
import type { CliReplOptions } from './cli-repl';
import { CliRepl } from './cli-repl';
import { CliReplErrors } from './error-codes';
import type { DevtoolsConnectOptions } from '@mongosh/service-provider-node-driver';
import type { AddressInfo } from 'net';
import sinon from 'sinon';
import type { CliUserConfig } from '@mongosh/types';
import { MongoLogWriter, MongoLogManager } from 'mongodb-log-writer';
const { EJSON } = bson;

const delay = promisify(setTimeout);

describe('CliRepl', function () {
  let cliReplOptions: CliReplOptions;
  let cliRepl: CliRepl & {
    start(
      cstr: string,
      options: Partial<DevtoolsConnectOptions>
    ): Promise<void>;
  };
  let input: Duplex;
  let outputStream: Duplex;
  let output = '';
  let exitCode: null | number;
  let exitPromise: Promise<void>;
  const tmpdir = useTmpdir();

  async function log(): Promise<any[]> {
    if (!cliRepl.logWriter?.logFilePath) return [];
    await cliRepl.logWriter.flush(); // Ensure any pending data is written first
    return readReplLogFile(cliRepl.logWriter.logFilePath);
  }

  async function startWithExpectedImmediateExit(
    cliRepl: CliRepl,
    host: string
  ): Promise<void> {
    try {
      await cliRepl.start(host, {} as any);
      expect.fail('Expected start() to also exit immediately');
    } catch (err: any) {
      expect(err.message).to.include('onExit() unexpectedly returned');
    }
  }

  beforeEach(function () {
    input = new PassThrough();
    outputStream = new PassThrough();
    output = '';
    outputStream.setEncoding('utf8').on('data', (chunk) => {
      output += chunk;
    });
    exitCode = null;

    let resolveExitPromise!: () => void;
    exitPromise = new Promise<void>((resolve) => {
      resolveExitPromise = resolve;
    });

    cliReplOptions = {
      shellCliOptions: {},
      input: input,
      output: outputStream,
      shellHomePaths: {
        shellRoamingDataPath: tmpdir.path,
        shellLocalDataPath: tmpdir.path,
        shellRcPath: tmpdir.path,
      },
      onExit: (code?: number) => {
        exitCode = code ?? 0;
        resolveExitPromise();
        return Promise.resolve() as never;
      },
    };
  });

  context('with a broken output stream', function () {
    beforeEach(async function () {
      cliReplOptions.shellCliOptions = { nodb: true };
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start('', {});
      cliReplOptions.output.end();
    });

    it("doesn't throw errors", async function () {
      input.write('21 + 13\n');
      await waitEval(cliRepl.bus);
    });
  });

  context('with nodb', function () {
    beforeEach(function () {
      cliReplOptions.shellCliOptions = { nodb: true };
    });

    context('when ready', function () {
      beforeEach(async function () {
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});
      });

      it('evaluates javascript', async function () {
        input.write('21 + 13\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('34');
      });

      it('toggling telemetry changes config', async function () {
        const updateUser = waitBus(cliRepl.bus, 'mongosh:update-user');
        const evalComplete = waitBus(cliRepl.bus, 'mongosh:eval-complete');
        input.write('disableTelemetry()\n');
        const [telemetryUserIdentity] = await updateUser;
        expect(typeof telemetryUserIdentity).to.equal('object');

        await evalComplete; // eval-complete includes the fs.writeFile() call.
        const content = await fs.readFile(path.join(tmpdir.path, 'config'), {
          encoding: 'utf8',
        });
        expect(EJSON.parse(content).enableTelemetry).to.be.false;
      });

      it('does not store config options on disk that have not been changed', async function () {
        let content = await fs.readFile(path.join(tmpdir.path, 'config'), {
          encoding: 'utf8',
        });
        expect(Object.keys(EJSON.parse(content))).to.deep.equal([
          'userId',
          'telemetryAnonymousId',
          'enableTelemetry',
          'disableGreetingMessage',
        ]);

        input.write('config.set("inspectDepth", config.get("inspectDepth"))\n');

        await waitEval(cliRepl.bus);
        content = await fs.readFile(path.join(tmpdir.path, 'config'), {
          encoding: 'utf8',
        });
        expect(Object.keys(EJSON.parse(content))).to.deep.equal([
          'userId',
          'telemetryAnonymousId',
          'enableTelemetry',
          'disableGreetingMessage',
          'inspectDepth',
        ]);

        // When a new REPL is created:
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});
        content = await fs.readFile(path.join(tmpdir.path, 'config'), {
          encoding: 'utf8',
        });
        expect(Object.keys(EJSON.parse(content))).to.deep.equal([
          'userId',
          'telemetryAnonymousId',
          'enableTelemetry',
          'disableGreetingMessage',
          'inspectDepth',
        ]);
      });

      it('stores config options on disk cannot be represented in traditional JSON', async function () {
        input.write('config.set("inspectDepth", Infinity)\n');

        await waitEval(cliRepl.bus);
        const content = await fs.readFile(path.join(tmpdir.path, 'config'), {
          encoding: 'utf8',
        });
        expect(EJSON.parse(content).inspectDepth).equal(Infinity);
      });

      it('emits exit when asked to, Node.js-style', async function () {
        input.write('.exit\n');
        await exitPromise;
        expect(exitCode).to.equal(0);
      });

      it('emits exit when asked to, mongosh-style', async function () {
        input.write('exit\n');
        await exitPromise;
        expect(exitCode).to.equal(0);
      });

      it('emits exit when asked to, mongosh-style with an exit code + exit', async function () {
        input.write('exit(3)\n');
        await exitPromise;
        expect(exitCode).to.equal(3);
      });

      it('emits exit when asked to, mongosh-style with an exit code + quit', async function () {
        input.write('exit(3)\n');
        await exitPromise;
        expect(exitCode).to.equal(3);
      });

      it('writes syntax errors to the log file', async function () {
        expect(
          (await log()).filter((entry) =>
            entry.attr?.stack?.startsWith('SyntaxError:')
          )
        ).to.have.lengthOf(0);
        input.write('<cat>\n');
        await waitBus(cliRepl.bus, 'mongosh:error');
        await eventually(async () => {
          expect(
            (await log()).filter((entry) =>
              entry.attr?.stack?.startsWith('SyntaxError:')
            )
          ).to.have.lengthOf(1);
        });
      });

      it('does not write to log syntax errors if logging is disabled', async function () {
        expect(
          (await log()).filter((entry) =>
            entry.attr?.stack?.startsWith('SyntaxError:')
          )
        ).to.have.lengthOf(0);
        input.write('config.set("disableLogging", true)\n');
        await waitEval(cliRepl.bus);
        expect(output).includes('Setting "disableLogging" has been changed');

        input.write('<cat>\n');
        await waitBus(cliRepl.bus, 'mongosh:error');
        await eventually(async () => {
          expect(
            (await log()).filter((entry) =>
              entry.attr?.stack?.startsWith('SyntaxError:')
            )
          ).to.have.lengthOf(0);
        });
      });

      it('writes JS errors to the log file', async function () {
        input.write('throw new Error("plain js error")\n');
        await waitBus(cliRepl.bus, 'mongosh:error');
        await eventually(async () => {
          expect(
            (await log()).filter((entry) =>
              entry.attr?.stack?.startsWith('Error: plain js error')
            )
          ).to.have.lengthOf(1);
        });
      });

      it('writes Mongosh errors to the log file', async function () {
        input.write('db.auth()\n');
        await waitBus(cliRepl.bus, 'mongosh:error');
        await eventually(async () => {
          expect(
            (await log()).filter((entry) =>
              entry.attr?.stack?.startsWith('MongoshInvalidInputError:')
            )
          ).to.have.lengthOf(1);
        });
      });

      it('emits the error event when exit() fails', async function () {
        const onerror = waitBus(cliRepl.bus, 'mongosh:error');
        try {
          // calling exit will not "exit" since we are not stopping the process
          await cliRepl.exit(1);
        } catch (e: any) {
          const [emitted] = await onerror;
          expect(emitted).to.be.instanceOf(MongoshInternalError);
          await eventually(async () => {
            expect(
              (await log()).filter((entry) =>
                entry.attr?.stack?.startsWith('MongoshInternalError:')
              )
            ).to.have.lengthOf(1);
          });
          return;
        }
        expect.fail('expected error');
      });

      it('returns the list of available config options when asked to', function () {
        expect(cliRepl.listConfigOptions()).to.deep.equal([
          'displayBatchSize',
          'maxTimeMS',
          'enableTelemetry',
          'editor',
          'disableSchemaSampling',
          'snippetIndexSourceURLs',
          'snippetRegistryURL',
          'snippetAutoload',
          'inspectCompact',
          'inspectDepth',
          'historyLength',
          'showStackTraces',
          'redactHistory',
          'oidcRedirectURI',
          'oidcTrustedEndpoints',
          'browser',
          'updateURL',
          'disableLogging',
          'logLocation',
          'logRetentionDays',
          'logMaxFileCount',
          'logCompressionEnabled',
          'logRetentionGB',
        ] satisfies (keyof CliUserConfig)[]);
      });

      it('fails when trying to overwrite mongosh-owned config settings', async function () {
        output = '';
        input.write('config.set("telemetryAnonymousId", "foo")\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include(
          'Option "telemetryAnonymousId" is not available in this environment'
        );

        output = '';
        input.write('config.get("telemetryAnonymousId")\n');
        await waitEval(cliRepl.bus);
        expect(output).to.match(/^[a-z0-9]{24}\n> $/);
      });

      it('can restore previous config settings', async function () {
        output = '';
        input.write('config.set("editor", "vim")\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('Setting "editor" has been changed');

        output = '';
        input.write('config.reset("editor")\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include(
          'Setting "editor" has been reset to its default value'
        );

        output = '';
        input.write('config.get("editor")\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('null');
      });

      context('loading JS files from disk', function () {
        it('allows loading a file from the disk', async function () {
          const filenameA = path.resolve(
            __dirname,
            '..',
            'test',
            'fixtures',
            'load',
            'a.js'
          );
          input.write(`load(${JSON.stringify(filenameA)})\n`);
          await waitEval(cliRepl.bus);
          expect(output).to.contain('Hi!');
          input.write('variableFromA\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include('yes from A');
        });

        it('allows nested loading', async function () {
          const filenameB = path.resolve(
            __dirname,
            '..',
            'test',
            'fixtures',
            'load',
            'b.js'
          );
          input.write(`load(${JSON.stringify(filenameB)})\n`);
          await waitEval(cliRepl.bus);
          expect(output).to.contain('Hi!');
          input.write('variableFromA + " " + variableFromB\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include('yes from A yes from A from B');
        });

        it('allows async operations', async function () {
          const filenameC = path.resolve(
            __dirname,
            '..',
            'test',
            'fixtures',
            'load',
            'c.js'
          );
          input.write(`load(${JSON.stringify(filenameC)})\n`);
          await waitEval(cliRepl.bus);
          output = '';
          input.write('diff >= 50\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include('true');
        });
      });
    });

    context('during startup', function () {
      it('persists userId and telemetryAnonymousId', async function () {
        const telemetryUserIdentitys: {
          userId?: string;
          anonymousId?: string;
        }[] = [];
        for (let i = 0; i < 2; i++) {
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.bus.on('mongosh:new-user', (telemetryUserIdentity) =>
            telemetryUserIdentitys.push(telemetryUserIdentity)
          );
          cliRepl.bus.on('mongosh:update-user', (telemetryUserIdentity) =>
            telemetryUserIdentitys.push(telemetryUserIdentity)
          );
          await cliRepl.start('', {});
        }
        expect(telemetryUserIdentitys).to.have.lengthOf(2);
        expect(telemetryUserIdentitys[0]).to.deep.equal(
          telemetryUserIdentitys[1]
        );
      });

      it('emits error for invalid config', async function () {
        await fs.writeFile(path.join(tmpdir.path, 'config'), 'notjson');
        cliRepl = new CliRepl(cliReplOptions);
        const onerror = waitBus(cliRepl.bus, 'mongosh:error');
        try {
          await cliRepl.start('', {});
        } catch {
          /* not empty */
        }
        await onerror;
      });

      it('emits error for inaccessible home directory', async function () {
        if (process.platform === 'win32') {
          this.skip(); // TODO: Figure out why this doesn't work on Windows.
        }
        cliReplOptions.shellHomePaths.shellRoamingDataPath =
          '/nonexistent/inaccesible';
        cliReplOptions.shellHomePaths.shellLocalDataPath =
          '/nonexistent/inaccesible';
        cliRepl = new CliRepl(cliReplOptions);
        const onerror = waitBus(cliRepl.bus, 'mongosh:error');
        try {
          await cliRepl.start('', {});
        } catch {
          /* not empty */
        }
        await onerror;
      });

      it('removes old log files', async function () {
        const oldlogfile = path.join(
          tmpdir.path,
          '60a0064774d771e863d9a1e1_log'
        );
        const newerlogfile = path.join(
          tmpdir.path,
          `${new bson.ObjectId()}_log`
        );
        await fs.writeFile(oldlogfile, 'ignoreme');
        await fs.writeFile(newerlogfile, 'ignoreme');
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});
        await fs.stat(newerlogfile);
        await eventually(async () => {
          try {
            await fs.stat(oldlogfile);
            expect.fail('missed exception');
          } catch (err: any) {
            expect(err.code).to.equal('ENOENT');
          }
        });
      });

      it('verifies the Node.js version', async function () {
        const origVersionCheckEnvVar =
          process.env.MONGOSH_SKIP_NODE_VERSION_CHECK;
        delete process.env.MONGOSH_SKIP_NODE_VERSION_CHECK;
        delete (process as any).version;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore version is readonly
        process.version = 'v8.0.0';

        try {
          cliRepl = new CliRepl(cliReplOptions);
          const onerror = waitBus(cliRepl.bus, 'mongosh:error');
          try {
            await cliRepl.start('', {});
          } catch {
            /* not empty */
          }
          const [e] = await onerror;
          expect(e.name).to.equal('MongoshWarning');
          expect((e as any).code).to.equal(CliReplErrors.NodeVersionMismatch);
        } finally {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore version is readonly
          process.version = `v${process.versions.node}`;
          process.env.MONGOSH_SKIP_NODE_VERSION_CHECK =
            origVersionCheckEnvVar || '';
        }
      });

      context('mongoshrc', function () {
        it('loads .mongoshrc if it is present', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongoshrc.js'),
            'print("hi from mongoshrc")'
          );
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).to.include('hi from mongoshrc');
        });

        it('does not load .mongoshrc if --norc is passed', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongoshrc.js'),
            'print("hi from mongoshrc")'
          );
          cliReplOptions.shellCliOptions.norc = true;
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).not.to.include('hi from mongoshrc');
        });

        it('warns if .mongorc.js is present but not .mongoshrc.js', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongorc.js'),
            'print("hi from mongorc")'
          );
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).to.include(
            'Found ~/.mongorc.js, but not ~/.mongoshrc.js. ~/.mongorc.js will not be loaded.'
          );
          expect(output).to.include(
            'You may want to copy or rename ~/.mongorc.js to ~/.mongoshrc.js.'
          );
          expect(output).not.to.include('hi from mongorc');
        });

        it('warns if .mongoshrc is present but not .mongoshrc.js', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongoshrc'),
            'print("hi from misspelled")'
          );
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).to.include(
            'Found ~/.mongoshrc, but not ~/.mongoshrc.js.'
          );
          expect(output).not.to.include('hi from misspelled');
        });

        it('does not warn with --quiet if .mongorc.js is present but not .mongoshrc.js', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongorc.js'),
            'print("hi from mongorc")'
          );
          cliReplOptions.shellCliOptions.quiet = true;
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).not.to.include(
            'Found ~/.mongorc.js, but not ~/.mongoshrc.js'
          );
          expect(output).not.to.include('hi from mongorc');
        });

        it('does not warn with --quiet if .mongoshrc is present but not .mongoshrc.js', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongoshrc'),
            'print("hi from misspelled")'
          );
          cliReplOptions.shellCliOptions.quiet = true;
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).not.to.include(
            'Found ~/.mongoshrc, but not ~/.mongoshrc.js'
          );
          expect(output).not.to.include('hi from misspelled');
        });

        it('loads .mongoshrc recursively if wanted', async function () {
          const rcPath = path.join(tmpdir.path, '.mongoshrc.js');
          await fs.writeFile(
            rcPath,
            `globalThis.a = (globalThis.a + 1 || 0);
            if (a === 5) {
              print('reached five');
            } else {
              load(JSON.stringify(${rcPath})
            }`
          );
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).to.include('reached five');
        });

        it('if an exception is thrown, indicates that it comes from mongoshrc', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, '.mongoshrc.js'),
            'throw new Error("bananas")'
          );
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});
          expect(output).to.include('Error while running ~/.mongoshrc.js:');
          expect(output).to.include('Error: bananas');
        });
      });

      for (const jsContext of ['repl', 'plain-vm', undefined] as const) {
        context(
          `files loaded from command line (jsContext: ${
            jsContext ?? 'default'
          })`,
          function () {
            beforeEach(function () {
              cliReplOptions.shellCliOptions.jsContext = jsContext;
            });
            it('load a file if it has been specified on the command line', async function () {
              const filename1 = path.resolve(
                __dirname,
                '..',
                'test',
                'fixtures',
                'load',
                'hello1.js'
              );
              cliReplOptions.shellCliOptions.fileNames = [filename1];
              cliReplOptions.shellCliOptions.quiet = false;
              cliRepl = new CliRepl(cliReplOptions);
              await startWithExpectedImmediateExit(cliRepl, '');
              expect(output).to.include(`Loading file: ${filename1}`);
              expect(output).to.include('hello one');
              expect(exitCode).to.equal(0);
            });

            it('load two files if it has been specified on the command line', async function () {
              const filename1 = path.resolve(
                __dirname,
                '..',
                'test',
                'fixtures',
                'load',
                'hello1.js'
              );
              const filename2 = path.resolve(
                __dirname,
                '..',
                'test',
                'fixtures',
                'load',
                'hello2.js'
              );
              cliReplOptions.shellCliOptions.fileNames = [filename1, filename2];
              cliReplOptions.shellCliOptions.quiet = false;
              cliRepl = new CliRepl(cliReplOptions);
              await startWithExpectedImmediateExit(cliRepl, '');
              expect(output).to.include(`Loading file: ${filename1}`);
              expect(output).to.include('hello one');
              expect(output).to.include(`Loading file: ${filename2}`);
              expect(output).to.include('hello two');
              expect(exitCode).to.equal(0);
            });

            it('does not print filenames if --quiet is implied', async function () {
              const filename1 = path.resolve(
                __dirname,
                '..',
                'test',
                'fixtures',
                'load',
                'hello1.js'
              );
              cliReplOptions.shellCliOptions.fileNames = [filename1];
              cliRepl = new CliRepl(cliReplOptions);
              await startWithExpectedImmediateExit(cliRepl, '');
              expect(output).not.to.include('Loading file');
              expect(output).to.include('hello one');
              expect(exitCode).to.equal(0);
            });

            it('forwards the error it if loading the file throws', async function () {
              const filename1 = path.resolve(
                __dirname,
                '..',
                'test',
                'fixtures',
                'load',
                'throw.js'
              );
              cliReplOptions.shellCliOptions.fileNames = [filename1];
              cliReplOptions.shellCliOptions.quiet = false;
              cliRepl = new CliRepl(cliReplOptions);
              try {
                await cliRepl.start('', {});
              } catch (err: any) {
                expect(err.message).to.include('uh oh');
              }
              expect(output).to.include('Loading file');
              expect(output).not.to.include('uh oh');
            });

            it('evaluates code passed through --eval (single argument)', async function () {
              cliReplOptions.shellCliOptions.eval = [
                '"i am" + " being evaluated"',
              ];
              cliRepl = new CliRepl(cliReplOptions);
              await startWithExpectedImmediateExit(cliRepl, '');
              expect(output).to.include('i am being evaluated');
              expect(exitCode).to.equal(0);
            });

            it('forwards the error if the script passed to --eval throws (single argument)', async function () {
              cliReplOptions.shellCliOptions.eval = [
                'throw new Error("oh no")',
              ];
              cliRepl = new CliRepl(cliReplOptions);
              try {
                await cliRepl.start('', {});
              } catch (err: any) {
                expect(err.message).to.include('oh no');
              }
              expect(output).not.to.include('oh no');
            });

            it('evaluates code passed through --eval (multiple arguments)', async function () {
              cliReplOptions.shellCliOptions.eval = [
                'X = "i am"; "asdfghjkl"',
                'X + " being evaluated"',
              ];
              cliRepl = new CliRepl(cliReplOptions);
              await startWithExpectedImmediateExit(cliRepl, '');
              expect(output).to.not.include('asdfghjkl');
              expect(output).to.include('i am being evaluated');
              expect(exitCode).to.equal(0);
            });

            it('forwards the error if the script passed to --eval throws (multiple arguments)', async function () {
              cliReplOptions.shellCliOptions.eval = [
                'throw new Error("oh no")',
                'asdfghjkl',
              ];
              cliRepl = new CliRepl(cliReplOptions);
              try {
                await cliRepl.start('', {});
              } catch (err: any) {
                expect(err.message).to.include('oh no');
              }
              expect(output).to.not.include('asdfghjkl');
              expect(output).not.to.include('oh no');
            });

            it('evaluates code in the expected environment (non-interactive)', async function () {
              cliReplOptions.shellCliOptions.eval = [
                'print(":::" + (globalThis[Symbol.for("@@mongosh.usingPlainVMContext")] ? "plain-vm" : "repl"))',
              ];
              cliRepl = new CliRepl(cliReplOptions);
              await startWithExpectedImmediateExit(cliRepl, '');
              expect(output).to.include(`:::${jsContext ?? 'plain-vm'}`);
              expect(exitCode).to.equal(0);
            });

            if (jsContext !== 'plain-vm') {
              it('evaluates code in the expected environment (interactive)', async function () {
                cliReplOptions.shellCliOptions.eval = [
                  'print(":::" + (globalThis[Symbol.for("@@mongosh.usingPlainVMContext")] ? "plain-vm" : "repl"))',
                ];
                cliReplOptions.shellCliOptions.shell = true;
                cliRepl = new CliRepl(cliReplOptions);
                await cliRepl.start('', {});
                input.write('exit\n');
                await waitBus(cliRepl.bus, 'mongosh:closed');
                expect(output).to.include(`:::${jsContext ?? 'repl'}`);
                expect(exitCode).to.equal(0);
              });
            }
          }
        );
      }

      context('in --json mode', function () {
        beforeEach(function () {
          cliReplOptions.shellCliOptions.quiet = true;
        });

        it('serializes results as EJSON with --json', async function () {
          cliReplOptions.shellCliOptions.eval = ['({ a: Long("0") })'];
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          expect(JSON.parse(output)).to.deep.equal({ a: { $numberLong: '0' } });
          expect(exitCode).to.equal(0);
        });

        it('serializes results as EJSON with --json=canonical', async function () {
          cliReplOptions.shellCliOptions.eval = ['({ a: Long("0") })'];
          cliReplOptions.shellCliOptions.json = 'canonical';
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          expect(JSON.parse(output)).to.deep.equal({ a: { $numberLong: '0' } });
          expect(exitCode).to.equal(0);
        });

        it('serializes results as EJSON with --json=relaxed', async function () {
          cliReplOptions.shellCliOptions.eval = ['({ a: Long("0") })'];
          cliReplOptions.shellCliOptions.json = 'relaxed';
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          expect(JSON.parse(output)).to.deep.equal({ a: 0 });
          expect(exitCode).to.equal(0);
        });

        it('serializes user errors as EJSON with --json', async function () {
          cliReplOptions.shellCliOptions.eval = ['throw new Error("asdf")'];
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          const parsed = JSON.parse(output);
          expect(parsed).to.haveOwnProperty('message', 'asdf');
          expect(parsed).to.haveOwnProperty('name', 'Error');
          expect(parsed.stack).to.be.a('string');
          expect(exitCode).to.equal(1);
        });

        it('serializes mongosh errors as EJSON with --json', async function () {
          cliReplOptions.shellCliOptions.eval = ['db'];
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          const parsed = JSON.parse(output);
          expect(parsed).to.haveOwnProperty(
            'message',
            '[SHAPI-10004] No connected database'
          );
          expect(parsed).to.haveOwnProperty('name', 'MongoshInvalidInputError');
          expect(parsed).to.haveOwnProperty('code', 'SHAPI-10004');
          expect(parsed.stack).to.be.a('string');
          expect(exitCode).to.equal(1);
        });

        it('serializes primitive exceptions as EJSON with --json', async function () {
          cliReplOptions.shellCliOptions.eval = ['throw null'];
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          const parsed = JSON.parse(output);
          expect(parsed).to.haveOwnProperty('message', 'null');
          expect(parsed).to.haveOwnProperty('name', 'Error');
          expect(parsed.stack).to.be.a('string');
          expect(exitCode).to.equal(1);
        });

        it('handles first-attempt EJSON serialization errors', async function () {
          cliReplOptions.shellCliOptions.eval = [
            '({ toJSON() { throw new Error("nested error"); }})',
          ];
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(cliRepl, '');
          const parsed = JSON.parse(output);
          expect(parsed).to.haveOwnProperty('message', 'nested error');
          expect(parsed).to.haveOwnProperty('name', 'Error');
          expect(parsed.stack).to.be.a('string');
          expect(exitCode).to.equal(1);
        });

        it('does not handle second-attempt EJSON serialization errors', async function () {
          cliReplOptions.shellCliOptions.eval = [
            '({ toJSON() { throw ({ toJSON() { throw new Error("nested error") }}) }})',
          ];
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          try {
            await cliRepl.start('', {});
            expect.fail('missed exception');
          } catch (err: any) {
            expect(err.message).to.equal('nested error');
          }
        });

        it('rejects --json without --eval specifications', async function () {
          cliReplOptions.shellCliOptions.json = true;
          cliRepl = new CliRepl(cliReplOptions);
          try {
            await cliRepl.start('', {});
            expect.fail('missed exception');
          } catch (err: any) {
            expect(err.message).to.equal(
              'Cannot use --json without --eval or with --shell or with extra files'
            );
          }
        });

        it('rejects --json with --shell specifications', async function () {
          cliReplOptions.shellCliOptions.eval = ['1'];
          cliReplOptions.shellCliOptions.json = true;
          cliReplOptions.shellCliOptions.shell = true;
          cliRepl = new CliRepl(cliReplOptions);
          try {
            await cliRepl.start('', {});
            expect.fail('missed exception');
          } catch (err: any) {
            expect(err.message).to.equal(
              'Cannot use --json without --eval or with --shell or with extra files'
            );
          }
        });

        it('rejects --json with --file specifications', async function () {
          cliReplOptions.shellCliOptions.eval = ['1'];
          cliReplOptions.shellCliOptions.json = true;
          cliReplOptions.shellCliOptions.fileNames = ['a.js'];
          cliRepl = new CliRepl(cliReplOptions);
          try {
            await cliRepl.start('', {});
            expect.fail('missed exception');
          } catch (err: any) {
            expect(err.message).to.equal(
              'Cannot use --json without --eval or with --shell or with extra files'
            );
          }
        });
      });

      context('with a global configuration file', function () {
        it('loads a global config file as YAML if present', async function () {
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(
            globalConfigFile,
            'mongosh:\n  redactHistory: remove-redact'
          );

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});

          output = '';
          input.write('config.get("redactHistory")\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include('remove-redact');
        });

        it('lets the local config file have preference over the global one', async function () {
          const localConfigFile = path.join(tmpdir.path, 'config');
          await fs.writeFile(localConfigFile, '{"redactHistory":"remove"}');
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(
            globalConfigFile,
            'mongosh:\n  redactHistory: remove-redact'
          );

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});

          output = '';
          input.write('config.get("redactHistory")\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include('remove');
        });

        it('loads a global config file as EJSON if present', async function () {
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(
            globalConfigFile,
            '{ "redactHistory": "remove-redact" }'
          );

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});

          output = '';
          input.write('config.get("redactHistory")\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include('remove-redact');
        });

        it('warns if a global config file is present but could not be parsed', async function () {
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(globalConfigFile, 'a: b: c\n');

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});

          expect(output).to.include(
            'Could not parse global configuration file at'
          );
          expect(output).to.include('a: b: c'); // echoes back the offending line
        });

        it('warns if a global config file is present but its values are invalid', async function () {
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(
            globalConfigFile,
            'mongosh:\n  redactHistory: meow'
          );

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start('', {});

          expect(output).to.include(
            'Warning: Ignoring config option "redactHistory" from'
          );
          expect(output).to.include(
            "redactHistory must be one of 'keep', 'remove', or 'remove-redact'"
          );
        });
      });

      context('showing update information', function () {
        let httpServer: HTTPServer;
        let httpServerUrl: string;

        beforeEach(async function () {
          httpServer = createHTTPServer((req, res) => {
            res.end(
              JSON.stringify({
                versions: [{ version: '2023.4.15' }],
              })
            );
          });
          httpServer.listen(0);
          await once(httpServer, 'listening');
          httpServerUrl = `http://127.0.0.1:${
            (httpServer.address() as AddressInfo).port
          }`;
        });

        afterEach(async function () {
          httpServer.close();
          await once(httpServer, 'close');
        });

        it('does not attempt to load information about new releases with --eval and no explicit --no-quiet', async function () {
          cliReplOptions.shellCliOptions.eval = ['1+1'];
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.fetchMongoshUpdateUrlRegardlessOfCiEnvironment = true;
          cliRepl.config.updateURL = httpServerUrl;
          let fetchingUpdateMetadataCalls = 0;
          cliRepl.bus.on(
            'mongosh:fetching-update-metadata',
            () => fetchingUpdateMetadataCalls++
          );
          await startWithExpectedImmediateExit(cliRepl, '');
          expect(fetchingUpdateMetadataCalls).to.equal(0);
        });

        it('does attempt to load information about new releases in --no-quiet mode', async function () {
          cliReplOptions.shellCliOptions.eval = ['1+1'];
          cliReplOptions.shellCliOptions.quiet = false;
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.fetchMongoshUpdateUrlRegardlessOfCiEnvironment = true;
          cliRepl.config.updateURL = httpServerUrl;
          let fetchingUpdateMetadataCalls = 0;
          cliRepl.bus.on(
            'mongosh:fetching-update-metadata',
            () => fetchingUpdateMetadataCalls++
          );
          const requestPromise = once(httpServer, 'request');
          await startWithExpectedImmediateExit(cliRepl, '');
          expect(fetchingUpdateMetadataCalls).to.equal(1);
          await requestPromise;
        });
      });
    });

    verifyAutocompletion({
      testServer: null,
      wantWatch: true,
      wantShardDistribution: true,
      hasCollectionNames: false,
      hasDatabaseNames: false,
    });

    context('pressing CTRL-C', function () {
      before(function () {
        if (process.platform === 'win32') {
          // cannot trigger SIGINT on Windows
          this.skip();
        }
        this.timeout(10_000);
      });

      beforeEach(async function () {
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});
      });

      it('cancels shell API commands that do not use the server', async function () {
        output = '';
        input.write('while(true) { print("I am alive"); };\n');
        await tick();
        process.kill(process.pid, 'SIGINT');

        await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
        expect(output).to.match(/^Stopping execution.../m);
        expect(output).to.not.include('MongoError');
        expect(output).to.not.include('Mongosh');
        expect(output).to.match(/>\s+$/);

        output = '';
        await delay(100);
        expect(output).to.not.include('alive');
      });

      it('ensures user code cannot catch the interrupt exception', async function () {
        output = '';
        input.write(
          'nope = false; while(true) { try { print("I am alive"); } catch { nope = true; } };\n'
        );
        await tick();
        process.kill(process.pid, 'SIGINT');

        await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
        expect(output).to.match(/^Stopping execution.../m);
        expect(output).to.not.include('MongoError');
        expect(output).to.not.include('Mongosh');
        expect(output).to.match(/>\s+$/);

        output = '';
        input.write('nope\n');
        await waitEval(cliRepl.bus);
        expect(output).to.not.contain(true);
      });
    });
  });

  context('with an actual server', function () {
    const testServer = startSharedTestServer();

    beforeEach(async function () {
      cliReplOptions.shellCliOptions.connectionSpecifier =
        await testServer.connectionString();
      cliRepl = new CliRepl(cliReplOptions);
    });

    afterEach(async function () {
      await cliRepl.mongoshRepl.close();
    });

    it('connects to a server and interacts with it', async function () {
      await cliRepl.start(await testServer.connectionString(), {});

      output = '';
      input.write('use clirepltest\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('switched to db clirepltest');

      output = '';
      input.write('db.cats.insertOne({name:"pia"})\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('acknowledged: true');

      output = '';
      input.write('db.cats.find()\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('pia');

      input.write('.exit\n');
    });

    it('prints cursor output in batches as requested', async function () {
      await cliRepl.start(await testServer.connectionString(), {});

      input.write('use clirepltest\n');
      await waitEval(cliRepl.bus);

      input.write(`for (let i = 0; i < 35; i++) { \
        db.coll.insertOne({ index: i }); \
      }
`);
      await waitEval(cliRepl.bus);

      // Get the first batch of 20 results.
      output = '';
      input.write('crs = db.coll.find()\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('index: 10');
      expect(output).not.to.include('index: 30');
      expect(output).to.include('Type "it" for more');

      // Print it again -- no change until iterated.
      output = '';
      input.write('crs\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('index: 10');
      expect(output).not.to.include('index: 30');

      // Iterate forward explicitly.
      output = '';
      input.write('it\n');
      await waitEval(cliRepl.bus);
      expect(output).not.to.include('index: 10');
      expect(output).to.include('index: 30');
      expect(output).not.to.include('Type "it" for more');

      // Still not iterating implicitly when we're printing the cursor itself.
      output = '';
      input.write('crs\n');
      await waitEval(cliRepl.bus);
      expect(output).not.to.include('index: 10');
      expect(output).to.include('index: 30');

      input.write('.exit\n');
    });
    it('asks for a password if one is required, connection string edition', async function () {
      outputStream.on('data', (chunk) => {
        if (chunk.includes('Enter password')) {
          setImmediate(() => input.write('i want food\n'));
        }
      });
      const cs = new ConnectionString(await testServer.connectionString());
      cs.username = 'amy';
      let threw = true;
      try {
        await cliRepl.start(cs.href, {});
        threw = false;
      } catch (err: any) {
        expect(err.message).to.equal('Authentication failed.');
      }
      expect(threw).to.be.true;
      expect(output).to.match(/^Enter password: \**$/m);
      input.write('.exit\n');
    });

    it('respects a canceled password input', async function () {
      outputStream.on('data', (chunk) => {
        if (chunk.includes('Enter password')) {
          setImmediate(() => input.write('\u0003')); // Ctrl+C
        }
      });
      Object.assign(outputStream, fakeTTYProps);
      Object.assign(input, fakeTTYProps);
      const cs = new ConnectionString(await testServer.connectionString());
      cs.username = 'amy';
      const errored = waitBus(cliRepl.bus, 'mongosh:error');
      try {
        await cliRepl.start(cs.toString(), {});
      } catch {
        /* not empty */
      }
      const [err] = await errored;
      expect(err.message).to.equal('The request was aborted by the user');
    });

    it('allows .forEach with async code for cursors', async function () {
      await cliRepl.start(await testServer.connectionString(), {});

      input.write('use clirepltest\n');
      await waitEval(cliRepl.bus);
      input.write('db.test.insertMany([{a:2},{a:4},{a:6}])\n');
      await waitEval(cliRepl.bus);
      input.write('let cursor = db.test.find();\n');
      await waitEval(cliRepl.bus);

      input.write(
        'cursor.forEach(doc => db.test.insertOne({ a: doc.a + 1 }))\n'
      );
      await waitEval(cliRepl.bus);

      output = '';
      input.write('db.test.find().sort({a:1}).map(doc => doc.a)\n');
      await waitEval(cliRepl.bus);
      expect(output).to.include('[ 2, 3, 4, 5, 6, 7 ]');

      input.write('.exit\n');
    });

    it('is quiet if --quiet is passed', async function () {
      cliReplOptions.shellCliOptions.quiet = true;
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start(await testServer.connectionString(), {});
      expect(output).to.match(/^[a-zA-Z0-9 ]*> $/); // Single line, only prompt
    });

    it('has the full greeting if --quiet is not passed', async function () {
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start(await testServer.connectionString(), {});
      // Full greeting:
      expect(output).to.match(/Current Mongosh Log ID:/);
      expect(output).to.match(/Connecting to:/);
      expect(output).to.match(/Using MongoDB:/);
      expect(output).to.match(/For mongosh info see:/);
    });

    it('has the full greeting if --quiet is set to false', async function () {
      cliReplOptions.shellCliOptions.quiet = false;
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start(await testServer.connectionString(), {});
      // Full greeting:
      expect(output).to.match(/Current Mongosh Log ID:/);
      expect(output).to.match(/Connecting to:/);
      expect(output).to.match(/Using MongoDB:/);
      expect(output).to.match(/For mongosh info see:/);
    });

    it('does not emit warnings when connecting multiple times', async function () {
      await cliRepl.start(await testServer.connectionString(), {});
      let warnings = 0;
      const warningListener = (warning: unknown) => {
        console.log('Unexpected warning', warning);
        warnings++;
      };
      process.on('warning', warningListener);
      try {
        input.write(
          'for (let i = 0; i < 10; i++) db.getMongo().setReadPref("primaryPreferred")\n'
        );
        await waitEval(cliRepl.bus);
      } finally {
        process.off('warning', warningListener);
      }
      expect(warnings).to.equal(0);
    });

    verifyAutocompletion({
      testServer: testServer,
      wantWatch: false,
      wantShardDistribution: false,
      hasCollectionNames: true,
      hasDatabaseNames: true,
    });

    context('analytics integration', function () {
      context('with network connectivity', function () {
        let srv: http.Server;
        let host: string;
        let requests: any[];
        let totalEventsTracked = 0;
        let telemetryDelay = 0;
        const setTelemetryDelay = (val: number) => {
          telemetryDelay = val;
        };

        beforeEach(async function () {
          process.env.MONGOSH_ANALYTICS_SAMPLE = 'true';
          requests = [];
          totalEventsTracked = 0;
          srv = http
            .createServer((req, res) => {
              let body = '';
              req
                .setEncoding('utf8')
                .on('data', (chunk) => {
                  body += chunk;
                })
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                .on('end', async () => {
                  requests.push({ req, body });
                  totalEventsTracked += JSON.parse(body).batch.length;
                  await delay(telemetryDelay);
                  res.writeHead(200);
                  res.end('Ok\n');
                });
            })
            .listen(0);
          await once(srv, 'listening');
          host = `http://localhost:${(srv.address() as AddressInfo).port}`;
          cliReplOptions.analyticsOptions = {
            host,
            apiKey: '🔑',
            alwaysEnable: true,
          };
          cliRepl = new CliRepl(cliReplOptions);
        });

        afterEach(async function () {
          delete process.env.MONGOSH_ANALYTICS_SAMPLE;
          srv.close();
          await once(srv, 'close');
          setTelemetryDelay(0);
          sinon.restore();
        });

        context('logging configuration', function () {
          it('logging is enabled by default and event is called', async function () {
            const onLogInitialized = sinon.stub();
            cliRepl.bus.on('mongosh:log-initialized', onLogInitialized);

            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('disableLogging')).is.false;

            expect(onLogInitialized).calledOnce;
            expect(cliRepl.logWriter).is.instanceOf(MongoLogWriter);
          });

          it('does not initialize logging when it is disabled', async function () {
            cliRepl.config.disableLogging = true;
            const onLogInitialized = sinon.stub();
            cliRepl.bus.on('mongosh:log-initialized', onLogInitialized);

            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('disableLogging')).is.true;
            expect(onLogInitialized).not.called;

            expect(cliRepl.logWriter).is.undefined;
          });

          it('logs cleanup errors', async function () {
            sinon
              .stub(MongoLogManager.prototype, 'cleanupOldLogFiles')
              .rejects(new Error('Method not implemented'));
            await cliRepl.start(await testServer.connectionString(), {});
            expect(
              (await log()).filter(
                (entry) =>
                  entry.ctx === 'log' &&
                  entry.msg === 'Error: Method not implemented'
              )
            ).to.have.lengthOf(1);
          });

          it('can get a log path', async function () {
            await cliRepl.start(await testServer.connectionString(), {});
            expect(cliRepl.getLogPath()).equals(
              path.join(
                tmpdir.path,
                (cliRepl.logWriter?.logId as string) + '_log'
              )
            );
          });

          const customLogLocation = useTmpdir();
          it('can set the log location and uses a prefix', async function () {
            cliRepl.config.logLocation = customLogLocation.path;
            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('logLocation')).equals(
              customLogLocation.path
            );
            expect(cliRepl.logWriter?.logFilePath).equals(
              path.join(
                customLogLocation.path,
                'mongosh_' + (cliRepl.logWriter?.logId as string) + '_log'
              )
            );
          });

          it('uses a prefix even if the custom location is the same as the home location', async function () {
            // This is a corner case where the custom location is the same as the home location.
            // The prefix is still added to the log file name for consistency. If the user needs
            // the default behavior for the log names, they should instead set the location to undefined.
            const customLogHomePath = cliRepl.shellHomeDirectory.localPath('.');
            cliRepl.config.logLocation = customLogHomePath;
            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('logLocation')).equals(
              customLogHomePath
            );
            const logName = path.join(
              customLogHomePath,
              'mongosh_' + (cliRepl.logWriter?.logId as string) + '_log'
            );
            expect(cliRepl.logWriter?.logFilePath).equals(logName);
            expect(cliRepl.getLogPath()).equals(path.join(logName));
          });

          it('can set log retention days', async function () {
            const testRetentionDays = 123;
            cliRepl.config.logRetentionDays = testRetentionDays;
            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('logRetentionDays')).equals(
              testRetentionDays
            );
            expect(cliRepl.logManager?._options.retentionDays).equals(
              testRetentionDays
            );
          });

          it('can set log retention GB', async function () {
            const testLogRetentionGB = 10;
            cliRepl.config.logRetentionGB = testLogRetentionGB;
            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('logRetentionGB')).equals(
              testLogRetentionGB
            );
            expect(cliRepl.logManager?._options.retentionGB).equals(
              testLogRetentionGB
            );
          });

          it('can set log max file count', async function () {
            const testMaxFileCount = 123;
            cliRepl.config.logMaxFileCount = testMaxFileCount;
            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('logMaxFileCount')).equals(
              testMaxFileCount
            );
            expect(cliRepl.logManager?._options.maxLogFileCount).equals(
              testMaxFileCount
            );
          });

          it('can set log compression', async function () {
            cliRepl.config.logCompressionEnabled = true;
            await cliRepl.start(await testServer.connectionString(), {});

            expect(await cliRepl.getConfig('logCompressionEnabled')).equals(
              true
            );
            expect(cliRepl.logManager?._options.gzip).equals(true);
          });
        });

        it('times out fast', async function () {
          const testStartMs = Date.now();
          // The `httpRequestTimeout` of our Segment Analytics is set to
          // 1000ms which makes these requests fail as they exceed the timeout.
          // Segment will silently fail http request errors when tracking and flushing.
          // This will cause the test to fail if the system running the tests is
          //  unable to flush telemetry in 1500ms.
          setTelemetryDelay(5000);
          await cliRepl.start(await testServer.connectionString(), {});
          this.timeout(Date.now() - testStartMs + 2500); // Do not include connection time in 2.5s timeout
          input.write('use somedb;\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const analyticsLog = (await log()).filter(
            (entry) =>
              entry.ctx === 'analytics' &&
              entry.msg === 'Flushed outstanding data'
          );
          expect(analyticsLog).to.have.lengthOf(1);
          expect(analyticsLog[0]).to.have.nested.property(
            'attr.flushError',
            null // Although the flush request will time out, it does not error.
          );
        });

        it('posts analytics data', async function () {
          await cliRepl.start(await testServer.connectionString(), {});
          if (requests.length < 1) {
            const [, res] = await once(srv, 'request');
            await once(res, 'close'); // Wait until HTTP response is written
          }
          expect(requests[0].req.headers.authorization).to.include(
            Buffer.from('🔑:').toString('base64')
          );
          expect(requests[0].body).to.include('identify');
          expect(requests[0].body).to.include(process.platform);
        });

        it('posts analytics if the environment variable MONGOSH_ANALYTICS_SAMPLE is provided', async function () {
          process.env.MONGOSH_ANALYTICS_SAMPLE = 'true';
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('use somedb;\n');
          await waitEval(cliRepl.bus);
          // There are warnings generated by the driver if exit is used to close
          // the REPL too early. That might be worth investigating at some point.
          await delay(100);
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const useEvents = requests.flatMap((req) =>
            JSON.parse(req.body).batch.filter(
              (entry: any) => entry.event === 'Use'
            )
          );
          expect(useEvents).to.have.lengthOf(1);
        });

        it('does not post analytics if the environment variable MONGOSH_ANALYTICS_SAMPLE is true but user disabled telemetry', async function () {
          process.env.MONGOSH_ANALYTICS_SAMPLE = 'true';
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('disableTelemetry()\n');
          await waitEval(cliRepl.bus);
          input.write('use somedb;\n');
          await waitEval(cliRepl.bus);
          // There are warnings generated by the driver if exit is used to close
          // the REPL too early. That might be worth investigating at some point.
          await delay(100);
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const useEvents = requests.flatMap((req) =>
            JSON.parse(req.body).batch.filter(
              (entry: any) => entry.event === 'Use'
            )
          );
          expect(useEvents).to.have.lengthOf(0);
        });

        it('stops posting analytics data after disableTelemetry()', async function () {
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('use somedb;\n');
          await waitEval(cliRepl.bus);
          input.write('disableTelemetry()\n');
          await waitEval(cliRepl.bus);
          input.write('use otherdb;\n');
          await waitEval(cliRepl.bus);
          input.write('enableTelemetry()\n');
          await waitEval(cliRepl.bus);
          input.write('use thirddb;\n');
          await waitEval(cliRepl.bus);
          // There are warnings generated by the driver if exit is used to close
          // the REPL too early. That might be worth investigating at some point.
          await delay(100);
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const useEvents = requests.flatMap((req) =>
            JSON.parse(req.body).batch.filter(
              (entry: any) => entry.event === 'Use'
            )
          );
          expect(useEvents).to.have.lengthOf(2);
        });

        it('posts analytics event for load() calls', async function () {
          await cliRepl.start(await testServer.connectionString(), {});
          const filenameB = path.resolve(
            __dirname,
            '..',
            'test',
            'fixtures',
            'load',
            'b.js'
          );
          input.write(`load(${JSON.stringify(filenameB)});\n`);
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const loadEvents = requests
            .map((req) =>
              JSON.parse(req.body).batch.filter(
                (entry: any) => entry.event === 'Script Loaded'
              )
            )
            .flat();
          expect(loadEvents).to.have.lengthOf(2);
          expect(loadEvents[0].properties.nested).to.equal(false);
          expect(loadEvents[1].properties.nested).to.equal(true);
        });

        it('posts analytics event for shell API calls', async function () {
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('db.printShardingStatus()\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const apiEvents = requests
            .map((req) =>
              JSON.parse(req.body).batch.filter(
                (entry: any) => entry.event === 'API Call'
              )
            )
            .flat();
          expect(apiEvents).to.have.lengthOf(1);
          expect(apiEvents[0].properties.class).to.equal('Database');
          expect(apiEvents[0].properties.method).to.equal(
            'printShardingStatus'
          );
          expect(apiEvents[0].properties.count).to.equal(1);
        });

        it('includes a statement about flushed telemetry in the log', async function () {
          await cliRepl.start(await testServer.connectionString(), {});
          const { logFilePath } = cliRepl.logWriter as MongoLogWriter;
          input.write('db.hello()\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const flushEntry = (await readReplLogFile(logFilePath)).find(
            (entry: any) => entry.id === 1_000_000_045
          );
          expect(flushEntry.attr.flushError).to.equal(null);
          expect(flushEntry.attr.flushDuration).to.be.a('number');
          expect(totalEventsTracked).to.equal(4);
        });

        it('sends out telemetry data for command line scripts', async function () {
          cliReplOptions.shellCliOptions.eval = ['db.hello()'];
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(
            cliRepl,
            await testServer.connectionString()
          );
          expect(
            requests
              .flatMap((req) =>
                JSON.parse(req.body).batch.map((entry: any) => entry.event)
              )
              .sort()
              .filter(Boolean)
          ).to.deep.equal([
            'API Call',
            'New Connection',
            'Script Evaluated',
            'Startup Time',
          ]);
          expect(totalEventsTracked).to.equal(5);
        });

        it('sends out telemetry data for multiple command line scripts', async function () {
          cliReplOptions.shellCliOptions.eval = [
            'db.hello(); db.hello();',
            'db.hello()',
          ];
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(
            cliRepl,
            await testServer.connectionString()
          );
          expect(totalEventsTracked).to.equal(7);

          const apiEvents = requests
            .map((req) =>
              JSON.parse(req.body).batch.filter(
                (entry: any) => entry.event === 'API Call'
              )
            )
            .flat();
          expect(apiEvents).to.have.lengthOf(2);
          expect(
            apiEvents.map((e) => [
              e.properties.class,
              e.properties.method,
              e.properties.count,
            ])
          ).to.deep.equal([
            ['Database', 'hello', 2],
            ['Database', 'hello', 1],
          ]);
        });

        it('sends out telemetry if the repl is running in an interactive mode in a containerized environment', async function () {
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.getIsContainerizedEnvironment = () => {
            return Promise.resolve(true);
          };
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('db.hello()\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          expect(totalEventsTracked).to.equal(4);
        });

        it('does not send out telemetry if the user starts with a no-telemetry config', async function () {
          await fs.writeFile(
            path.join(tmpdir.path, 'config'),
            EJSON.stringify({ enableTelemetry: false })
          );
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('db.hello()\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          expect(requests).to.have.lengthOf(0);
        });

        it('does not send out telemetry if the user starts with global force-disable-telemetry config', async function () {
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(
            globalConfigFile,
            'mongosh:\n  forceDisableTelemetry: true'
          );

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('db.hello()\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          expect(requests).to.have.lengthOf(0);
        });

        it('does not let the user modify telemetry settings with global force-disable-telemetry config', async function () {
          const globalConfigFile = path.join(tmpdir.path, 'globalconfig.conf');
          await fs.writeFile(
            globalConfigFile,
            'mongosh:\n  forceDisableTelemetry: true'
          );

          cliReplOptions.globalConfigPaths = [globalConfigFile];
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start(await testServer.connectionString(), {});

          output = '';
          input.write('enableTelemetry()\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include(
            "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
          );

          output = '';
          input.write('disableTelemetry()\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include(
            "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
          );

          output = '';
          input.write('config.set("enableTelemetry", true)\n');
          await waitEval(cliRepl.bus);
          expect(output).to.include(
            "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true"
          );

          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          expect(requests).to.have.lengthOf(0);
        });

        it('does not send out telemetry if the user only runs a script for disabling telemetry', async function () {
          cliReplOptions.shellCliOptions.eval = ['disableTelemetry()'];
          cliRepl = new CliRepl(cliReplOptions);
          await startWithExpectedImmediateExit(
            cliRepl,
            await testServer.connectionString()
          );
          expect(requests).to.have.lengthOf(0);
        });

        it('does not send out telemetry if the user runs a script for disabling telemetry and drops into the shell', async function () {
          cliReplOptions.shellCliOptions.eval = ['disableTelemetry()'];
          cliReplOptions.shellCliOptions.shell = true;
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start(await testServer.connectionString(), {});
          input.write('db.hello()\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          expect(requests).to.have.lengthOf(0);
        });

        it('does not send out telemetry if the repl is running in non-interactive mode in a containerized environment', async function () {
          cliReplOptions.shellCliOptions.eval = ['db.hello()'];
          cliRepl = new CliRepl(cliReplOptions);
          cliRepl.getIsContainerizedEnvironment = () => {
            return Promise.resolve(true);
          };
          await startWithExpectedImmediateExit(
            cliRepl,
            await testServer.connectionString()
          );
          expect(requests).to.have.lengthOf(0);
        });

        it('throttles telemetry beyond a certain rage', async function () {
          await cliRepl.start(await testServer.connectionString(), {});
          for (let i = 0; i < 60; i++) {
            input.write('db.hello()\n');
          }
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          const events = requests.flatMap((req) => {
            return JSON.parse(req.body).batch;
          });
          expect(events).to.have.lengthOf(30);
        });

        context('with a 5.0+ server', function () {
          skipIfServerVersion(testServer, '<= 4.4');

          it('posts analytics data including connection information', async function () {
            await cliRepl.start(await testServer.connectionString(), {
              serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
              },
            });
            input.write('db.test.find();\n');
            await waitEval(cliRepl.bus);
            // There are warnings generated by the driver if exit is used to close
            // the REPL too early. That might be worth investigating at some point.
            await delay(100);
            input.write('exit\n');
            await waitBus(cliRepl.bus, 'mongosh:closed');

            const connectEvents = requests.flatMap((req) =>
              JSON.parse(req.body).batch.filter(
                (entry: any) => entry.event === 'New Connection'
              )
            );
            expect(connectEvents).to.have.lengthOf(1);
            expect(connectEvents[0].anonymousId).to.be.a('string');
            const { properties } = connectEvents[0];
            expect(properties.mongosh_version).to.be.a('string');
            expect(properties.session_id).to.be.a('string');
            expect(properties.is_atlas).to.equal(false);
            expect(properties.node_version).to.equal(process.version);
            expect(properties.api_version).to.equal('1');
            expect(properties.api_strict).to.equal(true);
            expect(properties.api_deprecation_errors).to.equal(true);
          });
        });
      });

      context('without network connectivity', function () {
        beforeEach(async function () {
          const host = 'http://localhost:1';
          cliReplOptions.analyticsOptions = {
            host,
            apiKey: '🔑',
            alwaysEnable: true,
          };
          cliRepl = new CliRepl(cliReplOptions);
          await cliRepl.start(await testServer.connectionString(), {});
        });

        it('ignores errors', async function () {
          input.write('print(123 + 456);\n');
          input.write('exit\n');
          await waitBus(cliRepl.bus, 'mongosh:closed');
          expect(output).not.to.match(/error/i);
        });
      });
    });

    context('files loaded from command line', function () {
      it('load a file if it has been specified on the command line', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'hello1.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1];
        cliReplOptions.shellCliOptions.quiet = false;
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.include(`Loading file: ${filename1}`);
        expect(output).to.include('hello one');
        expect(exitCode).to.equal(0);
      });

      it('load two files if it has been specified on the command line', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'hello1.js'
        );
        const filename2 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'hello2.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1, filename2];
        cliReplOptions.shellCliOptions.quiet = false;
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.include(`Loading file: ${filename1}`);
        expect(output).to.include('hello one');
        expect(output).to.include(`Loading file: ${filename2}`);
        expect(output).to.include('hello two');
        expect(exitCode).to.equal(0);
      });

      it('allows doing db ops', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'insertintotest.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1, filename1];
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.match(/Inserted: ObjectId\('[a-z0-9]{24}'\)/);
        expect(exitCode).to.equal(0);
      });

      it('allows doing db ops (--eval variant)', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'insertintotest.js'
        );
        cliReplOptions.shellCliOptions.eval = [
          await fs.readFile(filename1, 'utf8'),
        ];
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.match(/Inserted: ObjectId\('[a-z0-9]{24}'\)/);
        expect(exitCode).to.equal(0);
      });

      it('drops into a shell if --shell is passed', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'insertintotest.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1];
        cliReplOptions.shellCliOptions.shell = true;

        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        expect(output).to.match(/Inserted: ObjectId\('[a-z0-9]{24}'\)/);
        expect(exitCode).to.equal(null);

        input.write(
          'print("doc count", insertTestCollection.countDocuments())\n'
        );
        await waitEval(cliRepl.bus);
        expect(output).to.include('doc count 1');

        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(exitCode).to.equal(0);
      });

      it('does not read .mongoshrc.js if --shell is not passed', async function () {
        await fs.writeFile(
          path.join(tmpdir.path, '.mongoshrc.js'),
          'print("hi from mongoshrc")'
        );
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'hello1.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1];

        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.include('hello one');
        expect(output).not.to.include('hi from mongoshrc');
        expect(exitCode).to.equal(0);
      });

      it('does read .mongoshrc.js if --shell is passed', async function () {
        await fs.writeFile(
          path.join(tmpdir.path, '.mongoshrc.js'),
          'print("hi from mongoshrc")'
        );
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'hello1.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1];
        cliReplOptions.shellCliOptions.shell = true;

        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        // Single regexp match to verify that mongoshrc is loaded *after* the script
        expect(output).to.match(/hello one[\s\S]*hi from mongoshrc/);
        expect(exitCode).to.equal(null);

        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(exitCode).to.equal(0);
      });

      it('isInteractive() is false for --eval without --shell', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'printisinteractive.js'
        );
        cliReplOptions.shellCliOptions.eval = [
          await fs.readFile(filename1, 'utf8'),
        ];
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.match(/isInteractive=false/);
        expect(exitCode).to.equal(0);
      });

      it('isInteractive() is true for --eval with --shell (eval)', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'printisinteractive.js'
        );
        cliReplOptions.shellCliOptions.eval = [
          await fs.readFile(filename1, 'utf8'),
        ];
        cliReplOptions.shellCliOptions.shell = true;
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        expect(output).to.match(/isInteractive=true/);
        expect(exitCode).to.equal(null);

        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(exitCode).to.equal(0);
      });

      it('isInteractive() is false for loaded file without --shell', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'printisinteractive.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1];
        cliRepl = new CliRepl(cliReplOptions);
        await startWithExpectedImmediateExit(
          cliRepl,
          await testServer.connectionString()
        );
        expect(output).to.match(/isInteractive=false/);
        expect(exitCode).to.equal(0);
      });

      it('isInteractive() is true for --eval with --shell (filenames)', async function () {
        const filename1 = path.resolve(
          __dirname,
          '..',
          'test',
          'fixtures',
          'load',
          'printisinteractive.js'
        );
        cliReplOptions.shellCliOptions.fileNames = [filename1];
        cliReplOptions.shellCliOptions.shell = true;
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});
        expect(output).to.match(/isInteractive=true/);
        expect(exitCode).to.equal(null);

        input.write('exit\n');
        await waitBus(cliRepl.bus, 'mongosh:closed');
        expect(exitCode).to.equal(0);
      });

      it('isInteractive() is true for plain shell', async function () {
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(await testServer.connectionString(), {});

        input.write('print("isInteractive=" + isInteractive())\n');
        await waitEval(cliRepl.bus);
        expect(output).to.match(/isInteractive=true/);
      });
    });

    context('with a user-provided prompt', function () {
      beforeEach(async function () {
        await cliRepl.start(await testServer.connectionString(), {});

        input.write('use clirepltest\n');
        await waitEval(cliRepl.bus);

        input.write('prompt = () => `on ${db.getName()}> `;\n');
        await waitEval(cliRepl.bus);

        output = '';
      });

      it('allows prompts that interact with shell API methods', async function () {
        input.write('1 + 2\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('on clirepltest> ');
      });

      it('renders the prompt correctly on interrupt', async function () {
        if (process.platform === 'win32') {
          // cannot trigger SIGINT on Windows
          return this.skip();
        }
        input.write('while(true) { sleep(500); }\n');
        process.kill(process.pid, 'SIGINT');

        await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');

        expect(output).to.contain('Stopping execution');
        expect(output).to.contain('on clirepltest> ');
      });
    });

    context('pressing CTRL-C', function () {
      before(function () {
        if (process.platform === 'win32') {
          // cannot trigger SIGINT on Windows
          this.skip();
        }
      });

      beforeEach(async function () {
        await cliRepl.start(await testServer.connectionString(), {});
        await tick();
        input.write('db.ctrlc.insertOne({ hello: "there" })\n');
        await waitEval(cliRepl.bus);
      });

      afterEach(async function () {
        input.write('db.ctrlc.drop()\n');
        await waitEval(cliRepl.bus);
      });

      context('for server < 4.1', function () {
        skipIfServerVersion(testServer, '>= 4.1');

        it('prints a warning to manually terminate operations', async function () {
          input.write('sleep(500); print(db.ctrlc.find({}));\n');
          await delay(100);

          output = '';
          process.kill(process.pid, 'SIGINT');

          await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
          expect(output).to.match(/^Stopping execution.../m);
          expect(output).to.match(
            /^WARNING: Operations running on the server cannot be killed automatically/m
          );
        });
      });

      context('for server >= 4.1', function () {
        skipIfServerVersion(testServer, '< 4.1');

        it('terminates operations on the server side', async function () {
          if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
            return this.skip(); // $currentOp is unversioned
          }
          input.write(
            "db.ctrlc.find({ $where: 'while(true) { /* loop1 */ }' })\n"
          );
          await delay(100);
          process.kill(process.pid, 'SIGINT');
          await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
          expect(output).to.match(/Stopping execution.../m);

          input.write('use admin\n');
          await waitEval(cliRepl.bus);

          await eventually(async () => {
            output = '';
            input.write(
              "db.aggregate([ {$currentOp: {} }, { $match: { 'command.find': 'ctrlc' } }, { $project: { command: 1 } } ])\n"
            );
            await waitEval(cliRepl.bus);

            expect(output).to.not.include('MongoError');
            expect(output).to.not.include('loop1');
          });
        });

        it('terminates operations also for explicitly created Mongo instances', async function () {
          input.write('dbname = db.getName()\n');
          await waitEval(cliRepl.bus);
          input.write(
            `client = Mongo("${await testServer.connectionString()}")\n`
          );
          await waitEval(cliRepl.bus);
          input.write('clientCtrlcDb = client.getDB(dbname);\n');
          await waitEval(cliRepl.bus);
          input.write("clientAdminDb = client.getDB('admin');\n");
          await waitEval(cliRepl.bus);

          input.write(
            "clientCtrlcDb.ctrlc.find({ $where: 'while(true) { /* loop2 */ }' })\n"
          );
          await delay(100);
          process.kill(process.pid, 'SIGINT');
          await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
          expect(output).to.match(/Stopping execution.../m);

          await eventually(async () => {
            output = '';
            input.write(
              "clientAdminDb.aggregate([ {$currentOp: {} }, { $match: { 'command.find': 'ctrlc' } }, { $project: { command: 1 } } ])\n"
            );
            await waitEval(cliRepl.bus);

            expect(output).to.not.include('MongoError');
            expect(output).to.not.include('loop2');
          });
        });
      });

      it('does not reconnect until the evaluation finishes', async function () {
        input.write('sleep(500); print(db.ctrlc.find({}));\n');
        await delay(100);

        output = '';
        process.kill(process.pid, 'SIGINT');

        await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
        expect(output).to.match(/^Stopping execution.../m);
        expect(output).to.not.include('MongoError');
        expect(output).to.not.include('MongoshInternalError');
        expect(output).to.not.include('hello');
        expect(output).to.match(/>\s+$/);

        output = '';
        await delay(1000);
        expect(output).to.be.empty;

        input.write('db.ctrlc.find({})\n');
        await waitEval(cliRepl.bus);
        expect(output).to.contain('hello');
      });

      it('cancels shell API commands that do not use the server', async function () {
        output = '';
        input.write('while(true) { print("I am alive"); };\n');
        await tick();
        process.kill(process.pid, 'SIGINT');

        await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
        expect(output).to.match(/^Stopping execution.../m);
        expect(output).to.not.include('MongoError');
        expect(output).to.not.include('Mongosh');
        expect(output).to.match(/>\s+$/);

        output = '';
        await delay(100);
        expect(output).to.not.include('alive');
      });

      it('ensures user code cannot catch the interrupt exception', async function () {
        output = '';
        input.write(
          'nope = false; while(true) { try { print("I am alive"); } catch { nope = true; } };\n'
        );
        await tick();
        process.kill(process.pid, 'SIGINT');

        await waitBus(cliRepl.bus, 'mongosh:interrupt-complete');
        expect(output).to.match(/^Stopping execution.../m);
        expect(output).to.not.include('MongoError');
        expect(output).to.not.include('Mongosh');
        expect(output).to.match(/>\s+$/);

        output = '';
        input.write('nope\n');
        await waitEval(cliRepl.bus);
        expect(output).to.not.contain(true);
      });
    });
  });

  context('with a replset node', function () {
    verifyAutocompletion({
      testServer: startTestServer('cli-repl-autocompletion', {
        topology: 'replset',
        secondaries: 0,
      }),
      wantWatch: true,
      wantShardDistribution: false,
      hasCollectionNames: true,
      hasDatabaseNames: true,
    });
  });

  context('with a mongos', function () {
    verifyAutocompletion({
      testServer: startTestServer('cli-repl-autocompletion', {
        topology: 'sharded',
        shards: 1,
        secondaries: 0,
      }),
      wantWatch: true,
      wantShardDistribution: true,
      hasCollectionNames: false, // We're only spinning up a mongos here
      hasDatabaseNames: true,
    });
  });

  context('with an auth-required mongod', function () {
    verifyAutocompletion({
      testServer: startTestServer('cli-repl-autocompletion-auth', {
        args: ['--auth'],
      }),
      wantWatch: false,
      wantShardDistribution: false,
      hasCollectionNames: false,
      hasDatabaseNames: false,
    });
  });

  function verifyAutocompletion({
    testServer,
    wantWatch,
    wantShardDistribution,
    hasCollectionNames,
    hasDatabaseNames,
  }: {
    testServer: MongodSetup | null;
    wantWatch: boolean;
    wantShardDistribution: boolean;
    hasCollectionNames: boolean;
    hasDatabaseNames: boolean;
  }): void {
    let wantVersion = true;
    let wantQueryOperators = true;

    if (process.env.USE_NEW_AUTOCOMPLETE && !testServer) {
      // mongodb-ts-autocomplete does not support noDb mode. It wouldn't be able
      // to list collections anyway, and since the collections don't exist it
      // wouldn't autocomplete methods on those collections.
      wantVersion = false;
      wantQueryOperators = false;
      wantWatch = false;
      wantShardDistribution = false;
      hasCollectionNames = false;
      hasDatabaseNames = false;
    }

    if (process.env.USE_NEW_AUTOCOMPLETE && testServer) {
      if ((testServer as any)?._opts.args?.includes('--auth')) {
        // mongodb-ts-autocomplete does not take into account the server version
        // or capabilities, so it always completes db.watch
        wantWatch = true;
        // db.collection.getShardDistribution won't be autocompleted because we
        // can't list the collections due to to auth being required
        wantShardDistribution = false;
        // we can't get the document schema because auth is required
        wantQueryOperators = false;
      } else {
        // mongodb-ts-autocomplete does not take into account the server version
        // or capabilities, so it always completes db.watch and
        // db.collection.getShardDistribution assuming collection exists and can
        // be listed
        wantWatch = true;
        wantShardDistribution = true;
      }
    }

    describe('autocompletion', function () {
      let cliRepl: CliRepl;

      const tabCompletion = async () => {
        await tick();
        input.write('\u0009');
        await waitCompletion(cliRepl.bus);
        await tick();
      };

      let docsLoadedPromise: Promise<void>;

      beforeEach(async function () {
        if (testServer === null) {
          cliReplOptions.shellCliOptions = { nodb: true };
        }
        cliReplOptions.nodeReplOptions = { terminal: true };
        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start(
          testServer ? await testServer.connectionString() : '',
          {} as any
        );

        if (!(testServer as any)?._opts.args?.includes('--auth')) {
          // make sure there are some collections we can autocomplete on below
          input.write('db.coll.insertOne({})\n');
          await waitEval(cliRepl.bus);
          input.write('db.movies.insertOne({ year: 1 })\n');
          await waitEval(cliRepl.bus);
        }

        docsLoadedPromise = new Promise<void>((resolve) => {
          cliRepl.bus.once('mongosh:load-sample-docs-complete', () => {
            resolve();
          });
        });
      });

      afterEach(async function () {
        expect(output, output).not.to.include('Tab completion error');
        expect(output, output).not.to.include(
          'listCollections requires authentication'
        );
        await cliRepl.mongoshRepl.close();
      });

      it(`${
        wantQueryOperators ? 'completes' : 'does not complete'
      } query operators`, async function () {
        input.write('db.movies.find({year: {$g');
        await tabCompletion();

        if (wantQueryOperators) {
          if (process.env.USE_NEW_AUTOCOMPLETE) {
            // wait for the documents to finish loading to be sure that the next
            // tabCompletion() call will work
            await docsLoadedPromise;
          }
        }

        await tabCompletion();

        if (wantQueryOperators) {
          expect(output).to.include('db.movies.find({year: {$gte');
        } else {
          expect(output).to.not.include('db.movies.find({year: {$gte');
        }
      });

      it(`${
        wantWatch ? 'completes' : 'does not complete'
      } the watch method`, async function () {
        if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
          return this.skip();
        }

        output = '';
        input.write('db.wat');
        await tabCompletion();
        await tabCompletion();
        if (wantWatch) {
          expect(output).to.include('db.watch');
        } else {
          expect(output).not.to.include('db.watch');
        }
      });

      it(`${
        wantVersion ? 'completes' : 'does not complete'
      } the version method`, async function () {
        if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
          return this.skip();
        }
        output = '';
        input.write('db.vers');
        await tabCompletion();
        await tabCompletion();
        if (wantVersion) {
          expect(output).to.include('db.version');
        } else {
          expect(output).to.not.include('db.version');
        }
      });

      it('does not complete legacy JS get/set definitions', async function () {
        if (+process.version.split('.')[0].slice(1) < 14) {
          return this.skip();
        }
        output = '';
        input.write('JSON.');
        await tabCompletion();
        await tabCompletion();
        expect(output).to.include('JSON.__proto__');
        expect(output).not.to.include('JSON.__defineGetter__');
        expect(output).not.to.include('JSON.__defineSetter__');
        expect(output).not.to.include('JSON.__lookupGetter__');
        expect(output).not.to.include('JSON.__lookupSetter__');
      });

      it(`${
        wantShardDistribution ? 'completes' : 'does not complete'
      } the getShardDistribution method`, async function () {
        if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
          return this.skip();
        }
        output = '';
        input.write('db.coll.getShardDis');
        await tabCompletion();
        await tabCompletion();
        if (wantShardDistribution) {
          expect(output).to.include('db.coll.getShardDistribution');
        } else {
          expect(output).not.to.include('db.coll.getShardDistribution');
        }
      });

      it('includes collection names', async function () {
        if (!hasCollectionNames) return this.skip();
        const collname = `testcollection${Date.now()}${
          (Math.random() * 1000) | 0
        }`;
        input.write(`db.${collname}.insertOne({});\n`);
        await waitEval(cliRepl.bus);

        output = '';
        input.write('db.testcoll');
        await tabCompletion();
        await tabCompletion();
        expect(output).to.include(collname);

        input.write(`db.${collname}.drop()\n`);
        await waitEval(cliRepl.bus);
      });

      it('completes JS value properties properly (incomplete, double tab)', async function () {
        input.write('JSON.');
        await tabCompletion();
        await tabCompletion();
        expect(output).to.include('JSON.parse');
        expect(output).to.include('JSON.stringify');
        expect(output).not.to.include('rawValue');
      });

      it('completes JS value properties properly (complete, single tab)', async function () {
        input.write('JSON.pa');
        await tabCompletion();
        expect(output).to.include('JSON.parse');
        expect(output).not.to.include('JSON.stringify');
        expect(output).not.to.include('rawValue');
      });

      it('completes shell commands', async function () {
        input.write('const dSomeVariableStartingWithD = 10;\n');
        await waitEval(cliRepl.bus);

        output = '';
        input.write('show d');
        await tabCompletion();
        expect(output).to.include('show databases');
        expect(output).not.to.include('dSomeVariableStartingWithD');
      });

      it('completes use <db>', async function () {
        if (!hasDatabaseNames) return this.skip();
        input.write('db.getMongo()._listDatabases()\n'); // populate database cache
        await waitEval(cliRepl.bus);

        input.write('use adm');
        await tabCompletion();
        expect(output).to.include('use admin');
      });

      it('completes properties of shell API result types', async function () {
        if (!hasCollectionNames) return this.skip();

        input.write(
          'res = db.autocompleteTestColl.deleteMany({ deletetestdummykey: 1 })\n'
        );
        await waitEval(cliRepl.bus);

        // Consistency check: The result actually has a shell API type tag:
        output = '';
        input.write('res[Symbol.for("@@mongosh.shellApiType")]\n');
        await waitEval(cliRepl.bus);
        expect(output).to.include('DeleteResult');

        input.write('res.a');
        await tabCompletion();
        await tabCompletion();
        expect(output).to.include('res.acknowledged');
      });

      it('completes only collection names that do not include control characters', async function () {
        if (!hasCollectionNames) return this.skip();

        input.write(
          'db["actestcoll1"].insertOne({}); db["actestcoll2\\x1bfooobar"].insertOne({})\n'
        );
        await waitEval(cliRepl.bus);
        input.write('db._getCollectionNames()\n'); // populate collection name cache
        await waitEval(cliRepl.bus);

        output = '';
        input.write('db.actestc');
        await tabCompletion();
        await tabCompletion();
        expect(output).to.include('db.actestcoll1');
        expect(output).to.not.include('db.actestcoll2');
      });
    });
  }

  context('with OIDC options', function () {
    it('sets OIDC options according with defaults', async function () {
      cliReplOptions.shellCliOptions = { nodb: true };
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start('', {});

      const o = await cliRepl.prepareOIDCOptions(
        'mongodb://localhost/',
        {} as any
      );
      expect(o.oidc?.allowedFlows).to.deep.equal(['auth-code']);
      expect(o.oidc?.notifyDeviceFlow).to.be.a('function');
      expect(o.authMechanismProperties).to.deep.equal({});
      expect(o.parentHandle).to.equal(undefined);
    });

    it('sets OIDC options according to config', async function () {
      cliReplOptions.shellCliOptions = { nodb: true };
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start('', {});
      input.write('config.set("oidcRedirectURI", "http://localhost:1234/")\n');
      await waitEval(cliRepl.bus);
      input.write(
        'config.set("oidcTrustedEndpoints", ["*.my-trusted-cluster.net"])\n'
      );
      await waitEval(cliRepl.bus);
      input.write('config.set("browser", "my-awesome-browser")\n');
      await waitEval(cliRepl.bus);

      let o: DevtoolsConnectOptions;
      process.env.MONGOSH_OIDC_PARENT_HANDLE = 'foo-bar';
      try {
        o = await cliRepl.prepareOIDCOptions('mongodb://localhost/', {} as any);
      } finally {
        delete process.env.MONGOSH_OIDC_PARENT_HANDLE;
      }
      expect(o.oidc?.allowedFlows).to.deep.equal(['auth-code']);
      expect(o.oidc?.notifyDeviceFlow).to.be.a('function');
      expect(o.oidc?.redirectURI).to.equal('http://localhost:1234/');
      expect(o.oidc?.openBrowser).to.deep.equal({
        command: 'my-awesome-browser',
      });
      expect(o.authMechanismProperties).to.deep.equal({
        ALLOWED_HOSTS: ['*.my-trusted-cluster.net'],
      });
      expect(o.parentHandle).to.equal('foo-bar');
    });
  });

  context('mongosh 2.x deprecation warnings', function () {
    const actualVersions = process.versions;
    beforeEach(function () {
      cliReplOptions.shellCliOptions = { nodb: true };
    });

    afterEach(function () {
      delete (process.versions as any).openssl;
      (process.versions as any).openssl = actualVersions.openssl;

      delete (process as any).version;
      (process as any).version = actualVersions.node;
    });

    it('prints a deprecation warning when running on platforms with GLIBC < 2.28, otherwise not', async function () {
      for (const { version, deprecated } of [
        { version: '3.0+glibcstring', deprecated: false },
        { version: '2.28.2', deprecated: false },
        { version: '2.28', deprecated: false },
        // This might look like is deprecated but since this is not a valid
        // semver even after co-ercion, we don't push warnings for such versions
        { version: '1.08', deprecated: false },
        { version: '2.21', deprecated: true },
        { version: '2.21-glibcstring', deprecated: true },
        { version: '2.21.4', deprecated: true },
        { version: '1.3.8', deprecated: true },
      ]) {
        cliRepl = new CliRepl(cliReplOptions);
        cliRepl.getGlibcVersion = () => version;
        await cliRepl.start('', {});

        if (deprecated) {
          expect(output).to.include('Deprecation warnings:');
          expect(output).to.include(
            'Using mongosh on the current operating system is deprecated, and support may be removed in a future release.'
          );
          expect(output).to.include(
            'See https://www.mongodb.com/docs/mongodb-shell/install/#supported-operating-systems for documentation on supported platforms.'
          );
        } else {
          expect(output).to.not.include(
            'Using mongosh on the current operating system is deprecated, and support may be removed in a future release.'
          );
        }
      }
    });

    it('does not print a platform unsupported deprecation warning when GLIBC information is not present (non-linux systems)', async function () {
      cliRepl = new CliRepl(cliReplOptions);
      cliRepl.getGlibcVersion = () => undefined;
      await cliRepl.start('', {});

      expect(output).to.not.include(
        'Using mongosh on the current operating system is deprecated, and support may be removed in a future release.'
      );
    });

    it('prints a deprecation warning when running with OpenSSL < 3.0.0, otherwise not', async function () {
      for (const { version, deprecated } of [
        { version: '4.0.1+uniqssl', deprecated: false },
        { version: '4.0', deprecated: false },
        { version: '3.0+uniqssl', deprecated: false },
        { version: '3.0', deprecated: false },
        { version: '2.21', deprecated: true },
        { version: '2.21-uniqssl', deprecated: true },
        { version: '2.21.4', deprecated: true },
        { version: '1.3.8', deprecated: true },
      ]) {
        delete (process.versions as any).openssl;
        (process.versions as any).openssl = version;

        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});
        if (deprecated) {
          expect(output).to.include('Deprecation warnings:');
          expect(output).to.include(
            'Using mongosh with OpenSSL versions lower than 3.0.0 is deprecated, and support may be removed in a future release.'
          );
          expect(output).to.include(
            'See https://www.mongodb.com/docs/mongodb-shell/install/#supported-operating-systems for documentation on supported platforms.'
          );
        } else {
          expect(output).to.not.include(
            'Using mongosh with OpenSSL versions lower than 3.0.0 is deprecated, and support may be removed in a future release.'
          );
        }
      }
    });

    it('prints a deprecation warning when running on Node.js < 20.0.0', async function () {
      for (const { version, deprecated } of [
        { version: 'v20.5.1', deprecated: false },
        { version: '20.0.0', deprecated: false },
        { version: '18.19.0', deprecated: true },
      ]) {
        delete (process as any).version;
        (process as any).version = version;

        cliRepl = new CliRepl(cliReplOptions);
        await cliRepl.start('', {});

        if (deprecated) {
          expect(output).to.include('Deprecation warnings:');
          expect(output).to.include(
            'Using mongosh with Node.js versions lower than 20.0.0 is deprecated, and support may be removed in a future release.'
          );
          expect(output).to.include(
            'See https://www.mongodb.com/docs/mongodb-shell/install/#supported-operating-systems for documentation on supported platforms.'
          );
        } else {
          expect(output).to.not.include(
            'Using mongosh with Node.js versions lower than 20.0.0 is deprecated, and support may be removed in a future release.'
          );
        }
      }
    });

    it('does not print any deprecation warning when CLI is ran with --quiet flag', async function () {
      // Setting all the possible situation for a deprecation warning
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore version is readonly
      process.version = '18.20.0';
      process.versions.openssl = '1.1.11';
      cliRepl.getGlibcVersion = () => '1.27';

      cliReplOptions.shellCliOptions.quiet = true;
      cliRepl = new CliRepl(cliReplOptions);
      await cliRepl.start('', {});
      expect(output).not.to.include('Deprecation warnings:');
      expect(output).not.to.include(
        'Using mongosh on the current operating system is deprecated, and support may be removed in a future release.'
      );
      expect(output).not.to.include(
        'Using mongosh with Node.js versions lower than 20.0.0 is deprecated, and support will be removed in a future release.'
      );
      expect(output).not.to.include(
        'Using mongosh with OpenSSL versions lower than 3.0.0 is deprecated, and support may be removed in a future release.'
      );
      expect(output).not.to.include(
        'See https://www.mongodb.com/docs/mongodb-shell/install/#supported-operating-systems for documentation on supported platforms.'
      );
    });
  });
});
