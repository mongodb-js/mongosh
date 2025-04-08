/* eslint-disable no-control-regex */
import { expect } from 'chai';
import type { Db } from 'mongodb';
import { MongoClient, ObjectId } from 'mongodb';

import { eventually } from '../../../testing/eventually';
import { TestShell } from './test-shell';
import { ensureTestShellAfterHook } from './test-shell-context';
import {
  skipIfServerVersion,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import { promises as fs, createReadStream } from 'fs';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import type { MongoLogEntryFromFile } from './repl-helpers';
import {
  readReplLogFile,
  setTemporaryHomeDirectory,
  useTmpdir,
} from './repl-helpers';
import { bson } from '@mongosh/service-provider-core';
import type { Server as HTTPServer } from 'http';
import { createServer as createHTTPServer } from 'http';
import { once } from 'events';
import type { AddressInfo } from 'net';
const { EJSON } = bson;
import { sleep } from './util-helpers';

const jsContextFlagCombinations: `--jsContext=${'plain-vm' | 'repl'}`[][] = [
  [],
  ['--jsContext=plain-vm'],
  ['--jsContext=repl'],
];

describe('e2e', function () {
  const testServer = startSharedTestServer();

  describe('--version', function () {
    it('gives the same result with version(), --version and --build-info', async function () {
      // version() sources its version data from the shell-api package's generated files,
      // --version from the cli-repl package.json and --build-info from the generated build-info.json
      // (if available), which should all match.
      const shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
      const versionFromShellApi = (await shell.executeLine('version()'))
        .replace(/>/g, '')
        .trim();

      const versionShell = this.startTestShell({ args: ['--version'] });
      await versionShell.waitForSuccessfulExit();
      const versionFromCliFlag = versionShell.output.trim();

      const buildInfoShell = this.startTestShell({ args: ['--build-info'] });
      await buildInfoShell.waitForSuccessfulExit();
      const versionFromBuildInfo = JSON.parse(buildInfoShell.output).version;

      expect(versionFromShellApi).to.equal(versionFromCliFlag);
      expect(versionFromCliFlag).to.equal(versionFromBuildInfo);
    });
  });

  describe('--build-info', function () {
    it('shows build info in JSON format', async function () {
      const shell = this.startTestShell({ args: ['--build-info'] });
      await shell.waitForSuccessfulExit();

      const data = JSON.parse(shell.output);
      expect(Object.keys(data)).to.deep.equal([
        'version',
        'distributionKind',
        'buildArch',
        'buildPlatform',
        'buildTarget',
        'buildTime',
        'gitVersion',
        'nodeVersion',
        'opensslVersion',
        'sharedOpenssl',
        'runtimeArch',
        'runtimePlatform',
        'runtimeGlibcVersion',
        'deps',
      ]);
      expect(data.version).to.be.a('string');
      expect(data.nodeVersion).to.be.a('string');
      expect(data.distributionKind).to.be.a('string');
      expect(
        ['unpackaged', 'packaged', 'compiled'].includes(data.distributionKind)
      ).to.be.true;
      expect(data.buildArch).to.be.a('string');
      expect(data.buildPlatform).to.be.a('string');
      expect(data.runtimeArch).to.be.a('string');
      expect(data.runtimePlatform).to.be.a('string');
      expect(data.opensslVersion).to.be.a('string');
      expect(data.sharedOpenssl).to.be.a('boolean');
      if (data.distributionKind !== 'unpackaged') {
        expect(data.buildTime).to.be.a('string');
        expect(data.gitVersion).to.be.a('string');
      } else {
        expect(data.buildTime).to.equal(null);
        expect(data.gitVersion).to.equal(null);
      }
      expect(data.deps.nodeDriverVersion).to.be.a('string');
      expect(data.deps.libmongocryptVersion).to.be.a('string');
      expect(data.deps.libmongocryptNodeBindingsVersion).to.be.a('string');

      if (process.version.startsWith('v16.')) return;

      let processReport: any;
      {
        const shell = this.startTestShell({
          args: [
            '--quiet',
            '--nodb',
            '--json=relaxed',
            '--eval',
            'process.report.getReport()',
          ],
        });
        await shell.waitForSuccessfulExit();
        processReport = JSON.parse(shell.output);
      }
      expect(data.runtimeGlibcVersion).to.equal(
        processReport.header.glibcVersionRuntime ?? 'N/A'
      );
    });

    it('provides build info via the buildInfo() builtin', async function () {
      const shell = this.startTestShell({
        args: [
          '--quiet',
          '--eval',
          'JSON.stringify(buildInfo().deps)',
          '--nodb',
        ],
      });
      await shell.waitForSuccessfulExit();
      const deps = JSON.parse(shell.output);
      expect(deps.nodeDriverVersion).to.be.a('string');
      expect(deps.libmongocryptVersion).to.be.a('string');
      expect(deps.libmongocryptNodeBindingsVersion).to.be.a('string');
    });
  });

  describe('--nodb', function () {
    let shell: TestShell;
    beforeEach(async function () {
      shell = this.startTestShell({
        args: ['--nodb'],
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('db throws', async function () {
      await shell.executeLine('db');
      shell.assertContainsError(
        'MongoshInvalidInputError: [SHAPI-10004] No connected database'
      );
    });
    it('show dbs throws InvalidInput', async function () {
      await shell.executeLine('show dbs');
      shell.assertContainsError(
        'MongoshInvalidInputError: [SHAPI-10004] No connected database'
      );
    });
    it('db.coll.find() throws InvalidInput', async function () {
      await shell.executeLine('db.coll.find()');
      shell.assertContainsError(
        'MongoshInvalidInputError: [SHAPI-10004] No connected database'
      );
      // We're seeing the prompt and not a stack trace.
      expect(shell.output).to.include('No connected database\n> ');
    });
    it('colorizes syntax errors', async function () {
      shell = this.startTestShell({
        args: ['--nodb'],
        env: { ...process.env, FORCE_COLOR: 'true', TERM: 'xterm-256color' },
        forceTerminal: true,
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();

      await shell.executeLine(',cat,\n');
      await eventually(() => {
        expect(shell.rawOutput).to.match(
          /SyntaxError(\x1b\[.*m)+: Unexpected token/
        );
        expect(shell.rawOutput).to.match(
          />(\x1b\[.*m)+ 1 \|(\x1b\[.*m)+ (\x1b\[.*m)+,(\x1b\[.*m)+cat(\x1b\[.*m)+,(\x1b\[.*m)+/
        );
      });
    });
    it('closes the shell when "exit" is entered', async function () {
      shell.writeInputLine('exit');
      await shell.waitForSuccessfulExit();
    });
    it('closes the shell when "quit" is entered', async function () {
      shell.writeInputLine('quit');
      await shell.waitForSuccessfulExit();
    });
    it('closes the shell with the specified exit code when "exit(n)" is entered', async function () {
      shell.writeInputLine('exit(42)');
      expect(await shell.waitForAnyExit()).to.equal(42);
    });
    it('closes the shell with the specified exit code when "quit(n)" is entered', async function () {
      shell.writeInputLine('quit(42)');
      expect(await shell.waitForAnyExit()).to.equal(42);
    });
    it('closes the shell with the pre-specified exit code when "exit" is entered', async function () {
      shell.writeInputLine('process.exitCode = 42; exit()');
      expect(await shell.waitForAnyExit()).to.equal(42);
    });
    it('closes the shell with the pre-specified exit code when "quit" is entered', async function () {
      shell.writeInputLine('process.exitCode = 42; quit()');
      expect(await shell.waitForAnyExit()).to.equal(42);
    });
    it('decorates internal errors with bug reporting information', async function () {
      const err = await shell.executeLine(
        'throw Object.assign(new Error("foo"), { code: "COMMON-90001" })'
      );
      expect(err).to.match(/^Error: foo$/m);
      expect(err).to.match(
        /^This is an error inside mongosh\. Please file a bug report for the MONGOSH project here: https:\/\/jira.mongodb.org\/projects\/MONGOSH\/issues\.$/m
      );
      expect(err).to.match(
        /^Please include the log file for this session \(.+[/\\][a-f0-9]{24}_log\)\.$/m
      );
    });
    it('does not expose parcelRequire', async function () {
      const err = await shell.executeLine('parcelRequire');
      expect(err).to.match(/ReferenceError: parcelRequire is not defined/);
    });
    it('does not expose __webpack_require__', async function () {
      const err = await shell.executeLine('__webpack_require__');
      expect(err).to.match(
        /ReferenceError: __webpack_require__ is not defined/
      );
    });
    it('parses code in sloppy mode by default (single line)', async function () {
      const result = await shell.executeLine('"<\\101>"');
      expect(result).to.match(/<A>/);
    });
    it('parses code in sloppy mode by default (multiline)', async function () {
      const result = await shell.executeLine('"a"+\n"<\\101>"');
      expect(result).to.match(/a<A>/);
    });
    it('handles \\r\\n newline input properly', async function () {
      shell.writeInput('34+55\r\n');
      await promisify(setTimeout)(100);
      shell.writeInput('_+55\r\n');
      await promisify(setTimeout)(100);
      shell.writeInput('_+89\r\n');
      await eventually(() => {
        shell.assertContainsOutput('233');
      });
    });
    it('accepts a --tlsFIPSMode argument', async function () {
      shell = this.startTestShell({
        args: ['--nodb', '--tlsFIPSMode'],
      });
      const result = await shell.waitForPromptOrExit();
      // Whether this worked depends on the environment the test is running in.
      // We check both possibilities.
      if (result.state === 'exit') {
        shell.assertContainsOutput('Could not enable FIPS mode');
        expect(result.exitCode).to.equal(1);
      } else {
        expect(await shell.executeLine('[crypto.getFips()]')).to.include(
          '[ 1 ]'
        );
      }
    });
    it('prints full output even when that output is buffered', async function () {
      shell = this.startTestShell({
        args: [
          '--nodb',
          '--quiet',
          '--eval',
          'EJSON.stringify([...Array(100_000).keys()].map(i=>({i})),null,2)',
        ],
        consumeStdio: false,
      });
      let buffer = '';
      let hasWaited = false;
      // Start reading data, wait a bit, then read the rest
      for await (const chunk of shell.process.stdout.setEncoding('utf8')) {
        buffer += chunk;
        if (buffer.includes('"i": 100') && !hasWaited) {
          // This delay is relevant for reproducing this bug; it gives
          // the mongosh process time to exit before all output has been printed.
          await new Promise((resolve) => setTimeout(resolve, 1000));
          hasWaited = true;
        }
      }
      expect(buffer).to.include('"i": 99999');
    });
    it('handles custom prompt() function in conjunction with line-by-line input well', async function () {
      // https://jira.mongodb.org/browse/MONGOSH-1617
      shell = this.startTestShell({
        args: [
          '--nodb',
          '--shell',
          '--eval',
          'prompt = () => {sleep(1);return "x>"}',
        ],
      });
      // The number of newlines here matters
      shell.writeInput(
        'sleep(100);print([1,2,3,4,5,6,7,8,9,10].reduce(\n(a,b) => { return a*b; }, 1))\n\n\n\n',
        { end: true }
      );
      await shell.waitForSuccessfulExit();
      shell.assertContainsOutput('3628800');
    });
    it('ignores control characters in TTY input', async function () {
      shell = this.startTestShell({
        args: ['--nodb'],
        forceTerminal: true,
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();

      expect(await shell.executeLine('24\b * 3\n')).to.include('\n6\n'); // \b is backspace
      expect(
        await shell.executeLine('\x1b[200~24\b * 3\x1b[201~\n')
      ).to.include('\n72\n');
    });
    it('ignores control characters in TTY input inside of .editor', async function () {
      shell = this.startTestShell({
        args: ['--nodb'],
        forceTerminal: true,
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();

      const start = shell.output.length;
      shell.writeInputLine('.editor');
      await shell.waitForPrompt(start, {
        promptPattern: /\/\/ Entering editor mode/,
      });
      expect(
        await shell.executeLine('\x1b[200~24\b * 3\x1b[201~\x04') // \x04 is Ctrl+D to finish code
      ).to.include('\n72\n');
    });
  });

  describe('set db', function () {
    for (const { mode, dbname, dbnameUri } of [
      {
        mode: 'no special characetrs',
        dbname: 'testdb1',
        dbnameUri: 'testdb1',
      },
      {
        mode: 'special characters',
        dbname: "ä:-,🐈_'[!?%",
        dbnameUri: "ä:-,🐈_'[!%3F%25",
      },
      {
        mode: 'Object.prototype dbname',
        dbname: 'hasOwnProperty',
        dbnameUri: 'hasOwnProperty',
      },
    ]) {
      context(mode, function () {
        describe('via host:port/test', function () {
          let shell: TestShell;
          beforeEach(async function () {
            shell = this.startTestShell({
              args: [`${await testServer.hostport()}/${dbname}`],
            });
            await shell.waitForPrompt();
            shell.assertNoErrors();
          });
          it('db set correctly', async function () {
            expect(await shell.executeLine('db')).to.include(dbname);
            shell.assertNoErrors();
          });
        });
        describe('via mongodb://uri', function () {
          let shell: TestShell;
          beforeEach(async function () {
            shell = this.startTestShell({
              args: [`mongodb://${await testServer.hostport()}/${dbnameUri}`],
            });
            await shell.waitForPrompt();
            shell.assertNoErrors();
          });
          it('db set correctly', async function () {
            expect(await shell.executeLine('db')).to.include(dbname);
            shell.assertNoErrors();
          });
        });
        describe('legacy db only', function () {
          let shell: TestShell;
          beforeEach(async function () {
            const port = await testServer.port();
            shell = this.startTestShell({ args: [dbname, `--port=${port}`] });
            await shell.waitForPrompt();
            shell.assertNoErrors();
          });
          it('db set correctly', async function () {
            expect(await shell.executeLine('db')).to.include(dbname);
            shell.assertNoErrors();
          });
        });
        describe('via use() method', function () {
          let shell: TestShell;
          beforeEach(async function () {
            shell = this.startTestShell({
              args: [`mongodb://${await testServer.hostport()}/`],
            });
            await shell.waitForPrompt();
            shell.assertNoErrors();
          });
          it('db set correctly', async function () {
            expect(
              await shell.executeLine(`use(${JSON.stringify(dbname)})`)
            ).to.include(dbname);
            shell.assertNoErrors();
          });
        });
      });
    }
  });

  describe('set appName', function () {
    context('with default appName', function () {
      let shell: TestShell;
      beforeEach(async function () {
        shell = this.startTestShell({
          args: [`mongodb://${await testServer.hostport()}/`],
        });
        await shell.waitForPrompt();
        shell.assertNoErrors();
      });
      it('appName set correctly', async function () {
        if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
          return this.skip(); // $currentOp is unversioned
        }
        const currentOp = await shell.executeLine('db.currentOp()');
        const expectedVersion =
          require('../package.json')['dependencies']['@mongosh/cli-repl'];
        expect(currentOp).to.include(`appName: 'mongosh ${expectedVersion}'`);
        expect(currentOp).to.include("name: 'nodejs|mongosh'");
        shell.assertNoErrors();
      });
    });

    context('with custom appName', function () {
      let shell: TestShell;
      beforeEach(async function () {
        shell = this.startTestShell({
          args: [`mongodb://${await testServer.hostport()}/?appName=Felicia`],
        });
        await shell.waitForPrompt();
        shell.assertNoErrors();
      });
      it('appName set correctly', async function () {
        if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
          return this.skip(); // $currentOp is unversioned
        }
        const currentOp = await shell.executeLine('db.currentOp()');
        expect(currentOp).to.include("appName: 'Felicia'");
        expect(currentOp).to.include("name: 'nodejs|mongosh'");
        shell.assertNoErrors();
      });
    });
  });

  describe('with connection string', function () {
    let db: Db;
    let client: MongoClient;
    let shell: TestShell;
    let dbName: string;

    beforeEach(async function () {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;
      shell = this.startTestShell({ args: [connectionString] });

      client = await MongoClient.connect(connectionString, {});

      db = client.db(dbName);

      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    afterEach(async function () {
      await db.dropDatabase();

      await client.close();
    });

    it('fle addon is available', async function () {
      const result = await shell.executeLine(
        '`<${typeof db._mongo._serviceProvider.createClientEncryption}>`'
      );
      expect(result).to.include('<function>');
    });

    describe('error formatting', function () {
      it('throws when a syntax error is encountered', async function () {
        await shell.executeLine(',x');
        shell.assertContainsError('SyntaxError: Unexpected token');
      });
      it('throws a runtime error', async function () {
        await shell.executeLine("throw new Error('a errmsg')");
        shell.assertContainsError('Error: a errmsg');
      });
      it('recognizes a driver error as error', async function () {
        await shell.executeLine(
          'db.coll.initializeOrderedBulkOp().find({}).update({}, {}).execute()'
        );
        // output varies by server version
        expect(shell.output).to.match(
          /multi update (only works with \$ operators|is not supported for replacement-style update)/
        );
      });
      context('when creating unique index', function () {
        skipIfServerVersion(testServer, '< 5.3');

        afterEach(async function () {
          await shell.executeLine('db.apples.drop()');
        });

        it('prints out violations for unique index creation', async function () {
          if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
            return this.skip(); // collMod.index.unique was removed from the stable API
          }

          await shell.executeLine(`db.apples.insertMany([
            { type: 'Delicious', quantity: 12 },
            { type: 'Macintosh', quantity: 13 },
            { type: 'Delicious', quantity: 13 },
            { type: 'Fuji', quantity: 15 },
            { type: 'Washington', quantity: 10 }
          ]);`);

          await shell.executeLine('db.apples.createIndex({ type: 1 });');

          await shell.executeLine(`db.runCommand({
            collMod: 'apples',
            index: {
              keyPattern: { type: 1 },
              prepareUnique: true
            }
          });`);

          const result = await shell.executeLine(`db.runCommand({
            collMod: 'apples',
            index: {
              keyPattern: { type: 1 },
              unique: true
            }
          });`);

          expect(result).to.match(/Violations:/);
          // Two duplicated ids
          expect(result).to.match(/ids: \[\s+ObjectId.+?\s+?ObjectId.+?\s+\]/m);
        });
      });
    });
    it('throws multiline input with a single line string', async function () {
      // this is an unterminated string constant and should throw, since it does
      // not pass: https://www.ecma-international.org/ecma-262/#sec-line-terminators
      await shell.executeLine('"this is a multi\nline string');
      shell.assertContainsError('SyntaxError: Unterminated string constant');
    });

    describe('literals', function () {
      it('number', async function () {
        expect(await shell.executeLine('1')).to.include('1');
        shell.assertNoErrors();
      });
      it('string', async function () {
        expect(await shell.executeLine('"string"')).to.include('string');
        shell.assertNoErrors();
      });
      it('undefined', async function () {
        await shell.executeLine('undefined');
        shell.assertNoErrors();
      });
      it('null', async function () {
        expect(await shell.executeLine('null')).to.include('null');
        shell.assertNoErrors();
      });
      it('bool', async function () {
        expect(await shell.executeLine('true')).to.include('true');
        shell.assertNoErrors();
      });
    });
    it('runs a complete function', async function () {
      await shell.executeLine("function x () {\nconsole.log('y')\n }");
      shell.assertNoErrors();
    });

    it('runs an unterminated function', async function () {
      shell.writeInputLine('function x () {');
      await eventually(() => {
        shell.assertContainsOutput('...');
      });
      shell.assertNoErrors();
    });

    it('runs help command', async function () {
      expect(await shell.executeLine('help')).to.include('Shell Help');
      shell.assertNoErrors();
    });

    it('db set correctly', async function () {
      expect(await shell.executeLine('db')).to.include('test');
      shell.assertNoErrors();
    });

    it('allows to find documents', async function () {
      await shell.executeLine(`use ${dbName}`);

      await db
        .collection('test')
        .insertMany([{ doc: 1 }, { doc: 2 }, { doc: 3 }]);

      const output = await shell.executeLine('db.test.find()');
      expect(output).to.include('doc: 1');
      expect(output).to.include('doc: 2');
      expect(output).to.include('doc: 3');

      shell.assertNotContainsOutput('CursorIterationResult');
      shell.assertNoErrors();
    });

    it('allows to find documents using aggregate', async function () {
      await shell.executeLine(`use ${dbName}`);

      await db
        .collection('test')
        .insertMany([{ doc: 1 }, { doc: 2 }, { doc: 3 }]);

      const output = await shell.executeLine(
        'db.test.aggregate({ $match: {} })'
      );
      expect(output).to.include('doc: 1');
      expect(output).to.include('doc: 2');
      expect(output).to.include('doc: 3');

      shell.assertNotContainsOutput('CursorIterationResult');
      shell.assertNoErrors();
    });

    it('allows collections with .', async function () {
      await shell.executeLine(`use ${dbName}`);

      await db
        .collection('test.dot')
        .insertMany([{ doc: 1 }, { doc: 2 }, { doc: 3 }]);

      const output = await shell.executeLine('db.test.dot.find()');
      expect(output).to.include('doc: 1');
      expect(output).to.include('doc: 2');
      expect(output).to.include('doc: 3');

      shell.assertNoErrors();
    });

    it('rewrites async for collections with .', async function () {
      await shell.executeLine(`use ${dbName}`);
      await shell.executeLine('const x = db.test.dot.insertOne({ d: 1 })');
      expect(await shell.executeLine('x.insertedId')).to.include('ObjectId');

      shell.assertNoErrors();
    });

    it('rewrites async for collections in the same statement', async function () {
      await shell.executeLine(`use ${dbName}`);
      expect(
        await shell.executeLine('db.test.insertOne({ d: 1 }).acknowledged')
      ).to.include('true');

      shell.assertNoErrors();
    });

    it('rewrites async properly for mapReduce', async function () {
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        return this.skip(); // mapReduce is unversioned
      }
      await shell.executeLine(`use ${dbName}`);
      await shell.executeLine('db.test.insertMany([{i:1},{i:2},{i:3},{i:4}]);');
      const result = await shell.executeLine(`db.test.mapReduce(function() {
        emit(this.i % 2, this.i);
      }, function(key, values) {
        return Array.sum(values);
      }, { out: { inline: 1 } }).results`);
      expect(result).to.include('{ _id: 0, value: 6 }');
      expect(result).to.include('{ _id: 1, value: 4 }');
    });

    it('rewrites async properly for common libraries', async function () {
      this.timeout(120_000);
      await shell.executeLine(`use ${dbName}`);
      await shell.executeLine(
        'db.test.insertOne({ d: new Date("2021-04-07T11:24:54+02:00") })'
      );
      shell.writeInputLine(
        `load(${JSON.stringify(require.resolve('lodash'))})`
      );
      shell.writeInputLine(
        `load(${JSON.stringify(require.resolve('moment'))})`
      );
      shell.writeInputLine('print("loaded" + "scripts")');
      await eventually(
        () => {
          // Use eventually explicitly to get a bigger timeout, lodash is
          // quite “big” in terms of async rewriting
          shell.assertContainsOutput('loadedscripts');
        },
        { timeout: 60_000 }
      );
      const result = await shell.executeLine(
        'moment(_.first(_.map(db.test.find().toArray(), "d"))).format("X")'
      );
      expect(result).to.include('1617787494');
      shell.assertNotContainsOutput('[BABEL]');
    });

    it('expands explain output indefinitely', async function () {
      await shell.executeLine('explainOutput = db.test.find().explain()');
      await shell.executeLine(
        'explainOutput.a = {b:{c:{d:{e:{f:{g:{h:{i:{j:{}}}}}}}}}}'
      );
      expect(await shell.executeLine('explainOutput')).to.match(
        /g:\s*\{\s*h:\s*\{\s*i:\s*\{\s*j:/
      );
    });

    it('throws the .toArray() suggestion when a user attempts to serialize a cursor', async function () {
      await shell.executeLine('const b = db.test.find()');
      await shell.executeLine('console.log(JSON.stringify(b));');
      shell.assertContainsOutput(
        'Cannot serialize a cursor to JSON. Did you mean to call .toArray() first?'
      );
    });

    it('expands explain output from aggregation indefinitely', async function () {
      await shell.executeLine(
        'explainOutput = db.test.aggregate([{ $limit: 1 }], {explain: "queryPlanner"})'
      );
      await shell.executeLine(
        'explainOutput.a = {b:{c:{d:{e:{f:{g:{h:{i:{j:{}}}}}}}}}}'
      );
      expect(await shell.executeLine('explainOutput')).to.match(
        /g:\s*\{\s*h:\s*\{\s*i:\s*\{\s*j:/
      );
    });

    it('allows toJSON on results of db operations', async function () {
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        return this.skip(); // listCommands is unversioned
      }
      expect(
        await shell.executeLine(
          'typeof JSON.parse(JSON.stringify(db.listCommands())).ping.help'
        )
      ).to.include('string');
      expect(
        await shell.executeLine(
          'typeof JSON.parse(JSON.stringify(db.test.insertOne({}))).insertedId'
        )
      ).to.include('string');
    });

    context('post-4.2', function () {
      skipIfServerVersion(testServer, '< 4.4');
      it('allows calling convertShardKeyToHashed() as a global function', async function () {
        expect(
          await shell.executeLine('convertShardKeyToHashed({foo:"bar"})')
        ).to.include("Long('4975617422686807705')");
      });

      it('rewrites async properly for a complex $function', async function () {
        await shell.executeLine(`use ${dbName}`);
        await shell.executeLine(
          'db.test.insertMany([{i:[1,{v:5}]},{i:[2,{v:6}]},{i:[3,{v:7}]},{i:[4,{v:8}]}]);'
        );
        const result = await shell.executeLine(`db.test.aggregate([
          {
            $project: {
              _id: 0,
              sum: {
                $function: {
                  body: function(i) { const [u,{v}] = i; return \`\${u + v}\`; },
                  args: ['$i'],
                  lang:'js'
                }
              }
            }
          }
        ])`);
        expect(result).to.include("{ sum: '12' }");
      });
    });

    describe('document validation errors', function () {
      context('post-4.4', function () {
        skipIfServerVersion(testServer, '<= 4.4');

        it('displays errInfo to the user', async function () {
          /* eslint-disable no-useless-escape */
          await shell.executeLine(`db.createCollection('contacts', {
            validator: {
              $and: [
                { phone: { $type: "string" } },
                { email: { $regex: /@mongodb\.com$/ } },
                { status: { $in: [ "Unknown", "Incomplete" ] } }
              ]
            }
          });`);
          /* eslint-enable no-useless-escape */
          const result = await shell.executeLine(`db.contacts.insertOne({
            email: "test@mongodb.com", status: "Unknown"
          });`);
          expect(result).to.include('Additional information:');
          expect(result).to.include("reason: 'field was missing'");
        });

        it('displays bulk result for failures to the user', async function () {
          await shell.executeLine(`db.createCollection('contacts', {
            validator: {
              $and: [
                { phone: { $type: "string" } },
                { email: { $regex: /@mongodb.com$/ } },
                { status: { $in: [ "Unknown", "Incomplete" ] } }
              ]
            }
          });`);
          const result = await shell.executeLine(`db.contacts.insertMany([
            { email: "test1@mongodb.com", status: "Unknown", phone: "123" },
            { email: "test2@mongodb.com", status: "Unknown" }
          ]);`);
          expect(result).to.include('Result:');
          expect(result).to.include('insertedCount: 1');
          expect(result).to.include('Write Errors:');
          expect(result).to.include('failingDocumentId:');
        });
      });
    });

    describe('cursor transform operations', function () {
      beforeEach(async function () {
        await shell.executeLine(`use ${dbName}`);
        await shell.executeLine(
          'for (let i = 0; i < 3; i++) db.coll.insertOne({i})'
        );
      });

      it('works with .map() with immediate .toArray() iteration', async function () {
        const result =
          await shell.executeLine(`const cs = db.coll.find().map((doc) => {
          print('mapped');
          return db.coll.find({_id:doc._id}).toArray()
        }); print('after'); cs.toArray()`);
        expect(result).to.include('after');
        expect(result).to.include('mapped');
        expect(result).to.include('i: 1');
      });

      it('works with .map() with later .toArray() iteration', async function () {
        const before =
          await shell.executeLine(`const cs = db.coll.find().map((doc) => {
          print('mapped');
          return db.coll.find({_id:doc._id}).toArray()
        }); print('after');`);
        expect(before).to.include('after');
        expect(before).not.to.include('mapped');
        const result = await shell.executeLine('cs.toArray()');
        expect(result).to.include('mapped');
        expect(result).to.include('i: 1');
      });

      it('works with .map() with implicit iteration', async function () {
        const before =
          await shell.executeLine(`const cs = db.coll.find().map((doc) => {
          print('mapped');
          return db.coll.findOne({_id:doc._id});
        }); print('after');`);
        expect(before).to.include('after');
        expect(before).not.to.include('mapped');
        const result = await shell.executeLine('cs');
        expect(result).to.include('mapped');
        expect(result).to.include('i: 1');
      });

      it('works with .forEach() iteration', async function () {
        await shell.executeLine('out = [];');
        const before =
          await shell.executeLine(`db.coll.find().forEach((doc) => {
          print('enter forEach');
          out.push(db.coll.findOne({_id:doc._id}));
          print('leave forEach');
        }); print('after');`);
        expect(before).to.match(
          /(enter forEach\r?\nleave forEach\r?\n){3}after/
        );
        const result = await shell.executeLine('out[1]');
        expect(result).to.include('i: 1');
      });

      it('works with for-of iteration', async function () {
        await shell.executeLine('out = [];');
        const before =
          await shell.executeLine(`for (const doc of db.coll.find()) {
          print('enter for-of');
          out.push(db.coll.findOne({_id:doc._id}));
          print('leave for-of');
        } print('after');`);
        expect(before).to.match(/(enter for-of\r?\nleave for-of\r?\n){3}after/);
        const result = await shell.executeLine('out[1]');
        expect(result).to.include('i: 1');
      });
    });
  });

  describe('with --host', function () {
    let shell: TestShell;
    it('allows invalid hostnames with _', async function () {
      shell = this.startTestShell({
        args: ['--host', 'xx_invalid_domain_xx'],
        env: { ...process.env, FORCE_COLOR: 'true', TERM: 'xterm-256color' },
        forceTerminal: true,
      });

      const result = await Promise.race([
        shell.waitForPromptOrExit(),
        promisify(setTimeout)(5000),
      ]);

      shell.assertNotContainsOutput('host');
      if (typeof result === 'object') {
        expect(result.state).to.equal('exit');
        shell.assertContainsOutput('MongoNetworkError');
      } else {
        shell.kill(os.constants.signals.SIGKILL);
      }
    });
  });

  describe('Ctrl+C aka SIGINT', function () {
    before(function () {
      if (process.platform === 'win32') {
        return this.skip(); // Cannot trigger SIGINT programmatically on Windows
      }
    });

    for (const jsContextFlags of jsContextFlagCombinations) {
      describe(`non-interactive (${JSON.stringify(
        jsContextFlags
      )})`, function () {
        it('interrupts file execution', async function () {
          const filename = path.resolve(
            __dirname,
            'fixtures',
            'load',
            'long-sleep.js'
          );
          const shell = this.startTestShell({
            args: ['--nodb', ...jsContextFlags, filename],
            removeSigintListeners: true,
            forceTerminal: true,
          });

          await eventually(() => {
            if (shell.output.includes('Long sleep')) {
              return;
            }
            throw new Error('Waiting for the file to load...');
          });

          shell.kill('SIGINT');

          await eventually(() => {
            if (shell.output.includes('MongoshInterruptedError')) {
              return;
            }
            throw new Error('Waiting for the interruption...');
          });
        });
      });
    }

    describe('interactive', function () {
      let shell: TestShell;
      beforeEach(async function () {
        shell = this.startTestShell({
          args: ['--nodb'],
          removeSigintListeners: true,
        });
        await shell.waitForPrompt();
        shell.assertNoErrors();
      });

      it('interrupts sync execution', async function () {
        await shell.executeLine('void process.removeAllListeners("SIGINT")');
        const result = shell.executeLine('while(true);');
        setTimeout(() => shell.kill('SIGINT'), 1000);
        await result;
        shell.assertContainsError('interrupted');
      });
      it('interrupts async awaiting', async function () {
        const result = shell.executeLine('new Promise(() => {});');
        setTimeout(() => shell.kill('SIGINT'), 3000);
        await result;
        shell.assertContainsOutput('Stopping execution...');
      });
      it('interrupts load()', async function () {
        const filename = path.resolve(
          __dirname,
          'fixtures',
          'load',
          'infinite-loop.js'
        );
        const result = shell.executeLine(`load(${JSON.stringify(filename)})`);
        setTimeout(() => shell.kill('SIGINT'), 3000);
        await result;
        // The while loop in the script is run as "sync" code
        shell.assertContainsError('interrupted');
      });
      it('behaves normally after an exception', async function () {
        await shell.executeLine('throw new Error()');
        await new Promise((resolve) => setTimeout(resolve, 100));
        shell.kill('SIGINT');
        await shell.waitForPrompt();
        await new Promise((resolve) => setTimeout(resolve, 100));
        shell.assertNotContainsOutput('interrupted');
        shell.assertNotContainsOutput('Stopping execution');
      });
      it('does not trigger MaxListenersExceededWarning', async function () {
        await shell.executeLine(
          'for (let i = 0; i < 11; i++) { console.log("hi"); }\n'
        );
        await shell.executeLine(
          'for (let i = 0; i < 20; i++) (async() => { await sleep(0) })()'
        );
        shell.assertNotContainsOutput('MaxListenersExceededWarning');
      });
    });
  });

  describe('printing', function () {
    let shell: TestShell;
    beforeEach(async function () {
      shell = this.startTestShell({ args: ['--nodb'] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('console.log() prints output exactly once', async function () {
      const result = await shell.executeLine('console.log(42);');
      expect(result).to.match(/\b42\b/);
      expect(result).not.to.match(/\b42[\s\r\n]*42\b/);
    });
    it('print() prints output exactly once', async function () {
      const result = await shell.executeLine('print(42);');
      expect(result).to.match(/\b42\b/);
      expect(result).not.to.match(/\b42[\s\r\n]*42\b/);
    });
  });

  describe('pipe from stdin', function () {
    let shell: TestShell;
    beforeEach(async function () {
      shell = this.startTestShell({
        args: [await testServer.connectionString()],
      });
    });

    it('reads and runs code from stdin, with .write()', async function () {
      const dbName = `test-${Date.now()}`;
      shell.process.stdin.write(`
      use ${dbName};
      db.coll1.insertOne({ foo: 55 });
      db.coll1.insertOne({ foo: 89 });
      db.coll1.aggregate([{$group: {_id: null, total: {$sum: '$foo'}}}])
      `);
      await eventually(() => {
        shell.assertContainsOutput('total: 144');
      });
    });

    it('reads and runs code from stdin, with .end()', async function () {
      const dbName = `test-${Date.now()}`;
      shell.process.stdin.end(`
      use ${dbName};
      db.coll1.insertOne({ foo: 55 });
      db.coll1.insertOne({ foo: 89 });
      db.coll1.aggregate([{$group: {_id: null, total: {$sum: '$foo'}}}])
      `);
      await eventually(() => {
        shell.assertContainsOutput('total: 144');
      });
    });

    it('reads and runs the vscode extension example playground', async function () {
      createReadStream(
        path.resolve(__dirname, 'fixtures', 'exampleplayground.js')
      ).pipe(shell.process.stdin);
      await eventually(() => {
        shell.assertContainsOutput("{ _id: 'xyz', totalSaleAmount: 150 }");
      });
    });

    it('treats piping a script into stdin line by line', async function () {
      if (process.env.MONGOSH_TEST_FORCE_API_STRICT) {
        return this.skip(); // collStats is unversioned
      }
      // This script doesn't work if evaluated as a whole, only when evaluated
      // line-by-line, due to Automatic Semicolon Insertion (ASI).
      createReadStream(
        path.resolve(__dirname, 'fixtures', 'asi-script.js')
      ).pipe(shell.process.stdin);
      await eventually(() => {
        shell.assertContainsOutput('admin;system.version;');
      });
    });

    it('works fine with custom prompts', async function () {
      // https://jira.mongodb.org/browse/MONGOSH-1617
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--eval',
          'prompt = () => db.stats().db',
          '--shell',
        ],
      });
      shell.writeInput(
        '[db.hello()].reduce(\n() => { return 11111*11111; },0)\n\n\n',
        { end: true }
      );
      await shell.waitForSuccessfulExit();
      shell.assertContainsOutput('123454321');
    });
  });

  describe('Node.js builtin APIs in the shell', function () {
    let shell: TestShell;
    beforeEach(async function () {
      shell = this.startTestShell({
        args: ['--nodb'],
        cwd: path.resolve(__dirname, 'fixtures', 'require-base'),
        env: {
          ...process.env,
          NODE_PATH: path.resolve(__dirname, 'fixtures', 'node-path'),
        },
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    it('require() searches the current working directory according to Node.js rules', async function () {
      let result;
      result = await shell.executeLine('require("a")');
      expect(result).to.match(/Error: Cannot find module 'a'/);
      result = await shell.executeLine('require("./a")');
      expect(result).to.match(/^A$/m);
      result = await shell.executeLine('require("b")');
      expect(result).to.match(/^B$/m);
      result = await shell.executeLine('require("c")');
      expect(result).to.match(/^C$/m);
    });

    it('Can use Node.js APIs without any extra effort', async function () {
      // Too lazy to write a fixture
      const result = await shell.executeLine(
        `fs.readFileSync(${JSON.stringify(__filename)}, 'utf8')`
      );
      expect(result).to.include('Too lazy to write a fixture');
    });
  });

  for (const jsContextFlags of jsContextFlagCombinations) {
    describe(`files loaded from command line (${JSON.stringify(
      jsContextFlags
    )})`, function () {
      context('file from disk', function () {
        it('loads a file from the command line as requested', async function () {
          const shell = this.startTestShell({
            args: ['--nodb', ...jsContextFlags, './hello1.js'],
            cwd: path.resolve(
              __dirname,
              '..',
              '..',
              'cli-repl',
              'test',
              'fixtures',
              'load'
            ),
          });
          await eventually(() => {
            shell.assertContainsOutput('hello one');
          });
          // We can't assert the exit code here currently because that breaks
          // when run under coverage, as we currently specify the location of
          // coverage files via a relative path and nyc fails to write to that
          // when started from a changed cwd.
          await shell.waitForSuccessfulExit();
        });

        if (!jsContextFlags.includes('--jsContext=plain-vm')) {
          it('drops into shell if --shell is used', async function () {
            const shell = this.startTestShell({
              args: ['--nodb', ...jsContextFlags, '--shell', './hello1.js'],
              cwd: path.resolve(
                __dirname,
                '..',
                '..',
                'cli-repl',
                'test',
                'fixtures',
                'load'
              ),
            });
            await shell.waitForPrompt();
            shell.assertContainsOutput('hello one');
            expect(await shell.executeLine('2 ** 16 + 1')).to.include('65537');
            shell.assertNoErrors();
          });

          it('fails with the error if the loaded script throws', async function () {
            const shell = this.startTestShell({
              args: ['--nodb', ...jsContextFlags, '--shell', './throw.js'],
              cwd: path.resolve(
                __dirname,
                '..',
                '..',
                'cli-repl',
                'test',
                'fixtures',
                'load'
              ),
            });
            await eventually(() => {
              shell.assertContainsOutput('Error: uh oh');
            });
            expect(await shell.waitForAnyExit()).to.equal(1);
          });
        }
      });

      context('--eval', function () {
        const script = 'const a = "hello", b = " one"; a + b';
        it('loads a script from the command line as requested', async function () {
          const shell = this.startTestShell({
            args: ['--nodb', ...jsContextFlags, '--eval', script],
          });
          await eventually(() => {
            shell.assertContainsOutput('hello one');
          });
          await shell.waitForSuccessfulExit();
        });

        if (!jsContextFlags.includes('--jsContext=plain-vm')) {
          it('drops into shell if --shell is used', async function () {
            const shell = this.startTestShell({
              args: ['--nodb', ...jsContextFlags, '--eval', script, '--shell'],
            });
            await shell.waitForPrompt();
            shell.assertContainsOutput('hello one');
            expect(await shell.executeLine('2 ** 16 + 1')).to.include('65537');
            shell.assertNoErrors();
          });
        }

        it('fails with the error if the loaded script throws synchronously', async function () {
          const shell = this.startTestShell({
            args: [
              '--nodb',
              ...jsContextFlags,
              '--eval',
              'throw new Error("uh oh")',
            ],
          });
          await eventually(() => {
            shell.assertContainsOutput('Error: uh oh');
          });
          expect(await shell.waitForAnyExit()).to.equal(1);
        });

        it('fails with the error if the loaded script throws asynchronously (setImmediate)', async function () {
          const shell = this.startTestShell({
            args: [
              '--nodb',
              ...jsContextFlags,
              '--eval',
              'setImmediate(() => { throw new Error("uh oh"); })',
            ],
          });
          await eventually(() => {
            shell.assertContainsOutput('Error: uh oh');
          });
          expect(await shell.waitForAnyExit()).to.equal(
            jsContextFlags.includes('--jsContext=repl') ? 0 : 1
          );
        });

        it('fails with the error if the loaded script throws asynchronously (Promise)', async function () {
          const shell = this.startTestShell({
            args: [
              '--nodb',
              ...jsContextFlags,
              '--eval',
              'void Promise.resolve().then(() => { throw new Error("uh oh"); })',
            ],
          });
          await eventually(() => {
            shell.assertContainsOutput('Error: uh oh');
          });
          expect(await shell.waitForAnyExit()).to.equal(
            jsContextFlags.includes('--jsContext=repl') ? 0 : 1
          );
        });

        it('runs scripts in the right environment', async function () {
          const script = `(async() => {
          await ${/* ensure asyncness */ 0};
          return {
            usingPlainVMContext: !!globalThis[Symbol.for("@@mongosh.usingPlainVMContext")],
            executionAsyncId: async_hooks.executionAsyncId()
          };
        })()`;
          const shell = this.startTestShell({
            args: [
              '--nodb',
              ...jsContextFlags,
              '--quiet',
              '--json',
              '--eval',
              script,
            ],
          });
          await shell.waitForSuccessfulExit();

          // Check that:
          //  - the script runs in the expected environment
          //  - async promise tracking is enabled if and only if we are running in REPL mode
          // The latter is particularly important because the performance benefits of
          // avoiding REPL mode mostly stem from the lack of async promise tracking.
          const result = EJSON.parse(shell.output);
          expect(result.usingPlainVMContext).to.deep.equal(
            !jsContextFlags.includes('--jsContext=repl')
          );
          if (result.usingPlainVMContext) {
            expect(result.executionAsyncId).to.equal(0);
          } else {
            expect(result.executionAsyncId).to.be.greaterThan(1);
          }
          shell.assertNoErrors();
        });
      });
    });
  }

  describe('config, logging and rc file', function () {
    let homedir: string;
    let env: Record<string, string>;
    let shell: TestShell;
    let configPath: string;
    let logBasePath: string;
    let historyPath: string;
    let readConfig: () => Promise<any>;
    let readLogFile: <T extends MongoLogEntryFromFile>(
      customBasePath?: string
    ) => Promise<T[]>;
    let startTestShell: (...extraArgs: string[]) => Promise<TestShell>;

    beforeEach(function () {
      const homeInfo = setTemporaryHomeDirectory();

      homedir = homeInfo.homedir;
      env = homeInfo.env;

      if (process.platform === 'win32') {
        logBasePath = path.resolve(homedir, 'local', 'mongodb', 'mongosh');
        configPath = path.resolve(
          homedir,
          'roaming',
          'mongodb',
          'mongosh',
          'config'
        );
        historyPath = path.resolve(
          homedir,
          'roaming',
          'mongodb',
          'mongosh',
          'mongosh_repl_history'
        );
      } else {
        logBasePath = path.resolve(homedir, '.mongodb', 'mongosh');
        configPath = path.resolve(homedir, '.mongodb', 'mongosh', 'config');
        historyPath = path.resolve(
          homedir,
          '.mongodb',
          'mongosh',
          'mongosh_repl_history'
        );
      }
      readConfig = async () =>
        EJSON.parse(await fs.readFile(configPath, 'utf8'));
      readLogFile = async <T extends MongoLogEntryFromFile>(
        customBasePath?: string
      ): Promise<T[]> => {
        if (!shell.logId) {
          throw new Error('Shell does not have a logId associated with it');
        }
        const logPath = path.join(
          customBasePath ?? logBasePath,
          `${customBasePath ? 'mongosh_' : ''}${shell.logId}_log`
        );
        return readReplLogFile<T>(logPath);
      };
      startTestShell = async (...extraArgs: string[]) => {
        const shell = this.startTestShell({
          args: ['--nodb', ...extraArgs],
          env,
          forceTerminal: true,
        });
        await shell.waitForPrompt();
        shell.assertNoErrors();
        return shell;
      };
    });

    // Ensure the afterEach below runs after shells are killed
    ensureTestShellAfterHook('afterEach', this);

    afterEach(async function () {
      TestShell.assertNoOpenShells();
      try {
        await fs.rm(homedir, { recursive: true, force: true });
      } catch (err: any) {
        // On Windows in CI, this can fail with EPERM for some reason.
        // If it does, just log the error instead of failing all tests.
        console.error('Could not remove fake home directory:', err);
      }
    });

    context('in fully accessible environment', function () {
      beforeEach(async function () {
        await fs.mkdir(homedir, { recursive: true });
        shell = await startTestShell();
      });

      describe('config file', function () {
        it('sets up a config file', async function () {
          const config = await readConfig();
          expect(config.userId).to.match(/^[a-f0-9]{24}$/);
          expect(config.telemetryAnonymousId).to.match(/^[a-f0-9]{24}$/);
          expect(config.enableTelemetry).to.be.true;
          expect(config.disableGreetingMessage).to.be.true;
        });

        it('persists between sessions', async function () {
          const config1 = await readConfig();
          await startTestShell();
          const config2 = await readConfig();
          expect(config1.userId).to.equal(config2.userId);
        });

        it('loads a global config file if present', async function () {
          const globalConfig = path.join(homedir, 'globalconfig.conf');
          await fs.writeFile(
            globalConfig,
            'mongosh:\n  redactHistory: remove-redact'
          );
          shell = this.startTestShell({
            args: ['--nodb'],
            env,
            globalConfigPath: globalConfig,
            forceTerminal: true,
          });
          await shell.waitForPrompt();
          expect(
            await shell.executeLine('config.get("redactHistory")')
          ).to.include('remove-redact');
          shell.assertNoErrors();
        });
      });

      describe('telemetry toggling', function () {
        it('enableTelemetry() yields a success response', async function () {
          expect(await shell.executeLine('enableTelemetry()')).to.include(
            'Telemetry is now enabled'
          );
          expect((await readConfig()).enableTelemetry).to.equal(true);
        });
        it('disableTelemetry() yields a success response', async function () {
          expect(await shell.executeLine('disableTelemetry();')).to.include(
            'Telemetry is now disabled'
          );
          expect((await readConfig()).enableTelemetry).to.equal(false);
        });
        it('enableTelemetry() returns an error if forceDisableTelemetry is set (but does not throw)', async function () {
          await shell.executeLine(
            'process.env.MONGOSH_FORCE_DISABLE_TELEMETRY_FOR_TESTING = 1'
          );
          expect(
            await shell.executeLine('enableTelemetry() + "<<<<"')
          ).to.include(
            "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true<<<<"
          );
          expect((await readConfig()).enableTelemetry).to.equal(true);
        });
        it('disableTelemetry() returns an error if forceDisableTelemetry is set (but does not throw)', async function () {
          await shell.executeLine(
            'process.env.MONGOSH_FORCE_DISABLE_TELEMETRY_FOR_TESTING = 1'
          );
          expect(
            await shell.executeLine('disableTelemetry() + "<<<<"')
          ).to.include(
            "Cannot modify telemetry settings while 'forceDisableTelemetry' is set to true<<<<"
          );
          expect((await readConfig()).enableTelemetry).to.equal(true);
        });
      });

      describe('log file', function () {
        it('does not get created if global config has disableLogging', async function () {
          const globalConfig = path.join(homedir, 'globalconfig.conf');
          await fs.writeFile(globalConfig, 'mongosh:\n  disableLogging: true');
          shell = this.startTestShell({
            args: ['--nodb'],
            env,
            globalConfigPath: globalConfig,
            forceTerminal: true,
          });
          await shell.waitForPrompt();
          expect(
            await shell.executeLine('config.get("disableLogging")')
          ).to.include('true');
          shell.assertNoErrors();

          expect(await shell.executeLine('print(123 + 456)')).to.include('579');
          expect(shell.logId).equals(null);
        });

        it('gets created if global config has disableLogging set to false', async function () {
          const globalConfig = path.join(homedir, 'globalconfig.conf');
          await fs.writeFile(globalConfig, 'mongosh:\n  disableLogging: false');
          shell = this.startTestShell({
            args: ['--nodb'],
            env,
            globalConfigPath: globalConfig,
            forceTerminal: true,
          });
          await shell.waitForPrompt();
          expect(
            await shell.executeLine('config.get("disableLogging")')
          ).to.include('false');
          shell.assertNoErrors();

          expect(await shell.executeLine('print(123 + 456)')).to.include('579');
          expect(shell.logId).not.equal(null);

          await eventually(async () => {
            const log = await readLogFile();
            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(123 + 456)'
              )
            ).to.have.lengthOf(1);
          });
        });

        describe('with custom log location', function () {
          const customLogDir = useTmpdir();

          it('fails with relative or invalid paths', async function () {
            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              `mongosh:\n  logLocation: "./some-relative-path"`
            );

            shell = this.startTestShell({
              args: ['--nodb'],
              env,
              globalConfigPath: globalConfig,
              forceTerminal: true,
            });
            await shell.waitForPrompt();
            shell.assertContainsOutput('Ignoring config option "logLocation"');
            shell.assertContainsOutput(
              'must be a valid absolute path or undefined'
            );

            expect(
              await shell.executeLine(
                'config.set("logLocation", "[123123123123]")'
              )
            ).contains(
              'Cannot set option "logLocation": logLocation must be a valid absolute path or undefined'
            );
          });

          it('gets created according to logLocation, if set', async function () {
            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              `mongosh:\n  logLocation: ${JSON.stringify(customLogDir.path)}`
            );

            shell = this.startTestShell({
              args: ['--nodb'],
              env,
              globalConfigPath: globalConfig,
              forceTerminal: true,
            });
            await shell.waitForPrompt();
            expect(
              await shell.executeLine('config.get("logLocation")')
            ).contains(customLogDir.path);

            try {
              await readLogFile();
              expect.fail('expected to throw');
            } catch (error) {
              expect((error as Error).message).includes(
                'no such file or directory'
              );
            }

            expect(
              (await readLogFile(customLogDir.path)).some(
                (log) => log.attr?.input === 'config.get("logLocation")'
              )
            ).is.true;
          });

          it('setting location while running mongosh does not have an immediate effect on logging', async function () {
            expect(
              await shell.executeLine('config.get("logLocation")')
            ).does.not.contain(customLogDir.path);
            const oldLogId = shell.logId;

            const oldLogEntries = await readLogFile();
            await shell.executeLine(
              `config.set("logLocation", ${JSON.stringify(customLogDir.path)})`
            );

            await shell.waitForPrompt();
            expect(
              await shell.executeLine('config.get("logLocation")')
            ).contains(customLogDir.path);

            expect(shell.logId).equals(oldLogId);

            try {
              await readLogFile(customLogDir.path);
              expect.fail('expected to throw');
            } catch (error) {
              expect((error as Error).message).includes(
                'no such file or directory'
              );
            }

            await eventually(async () => {
              const currentLogEntries = await readLogFile();

              expect(
                currentLogEntries.some(
                  (log) => log.attr?.input === 'config.get("logLocation")'
                )
              ).is.true;
              expect(currentLogEntries.length).is.greaterThanOrEqual(
                oldLogEntries.length
              );
            });
          });
        });

        /** Helper to visualize and compare the existence of files in a specific order.
         * Returns a string comprised of: 1 if a given file exists, 0 otherwise. */
        const getFilesState = async (paths: string[]) => {
          return (
            await Promise.all(
              paths.map((path) =>
                fs.stat(path).then(
                  () => 1,
                  () => 0
                )
              )
            )
          ).join('');
        };

        const getLogName = (
          logId: string | null,
          { isCompressed = false, prefix = 'mongosh_' } = {}
        ): string => {
          if (!logId) throw new Error('logId is not set');
          return `${prefix}${logId}_log${isCompressed ? '.gz' : ''}`;
        };

        /** Creates fake log files for testing. */
        const createFakeLogFiles = async ({
          count,
          prefix = 'mongosh_',
          size = 0,
          offset,
          basePath,
        }: {
          count: number;
          offset?: number;
          prefix?: string;
          basePath: string | null;
          size?: number;
        }): Promise<string[]> => {
          const paths: string[] = [];
          offset ??= Math.floor(Date.now() / 1000);
          for (let i = count - 1; i >= 0; i--) {
            const logPath = path.join(
              basePath ?? logBasePath,
              getLogName(ObjectId.createFromTime(offset - i).toHexString(), {
                prefix,
              })
            );
            paths.push(logPath);
            await fs.writeFile(logPath, '0'.repeat(size));
          }
          return paths;
        };

        describe('with custom log compression', function () {
          const customLogDir = useTmpdir();

          it('should created compressed files when enabled', async function () {
            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              `mongosh:\n  logLocation: ${JSON.stringify(
                customLogDir.path
              )}\n  logCompressionEnabled: true`
            );

            shell = this.startTestShell({
              args: ['--nodb'],
              env,
              globalConfigPath: globalConfig,
              forceTerminal: true,
            });

            await shell.waitForPrompt();

            const logFile = path.join(
              customLogDir.path,
              getLogName(shell.logId)
            );
            const logFileGzip = path.join(
              customLogDir.path,
              getLogName(shell.logId, { isCompressed: true })
            );

            // Only the gzipped file should exist
            expect(await getFilesState([logFile, logFileGzip])).equals('01');

            const logContent = await fs.readFile(logFileGzip);

            // gzipped files start with 0x1f 0x8b
            expect(logContent[0]).equals(0x1f);
            expect(logContent[1]).equals(0x8b);
          });
        });

        describe('with logRetentionDays', function () {
          const customLogDir = useTmpdir();

          it('should delete older files older than logRetentionDays', async function () {
            const paths: string[] = [];
            const today = Math.floor(Date.now() / 1000);
            const tenDaysAgo = today - 10 * 24 * 60 * 60;

            const retentionDays = 7;

            // Create 6 files older than 7 days
            paths.push(
              ...(await createFakeLogFiles({
                count: 6,
                offset: tenDaysAgo,
                basePath: customLogDir.path,
              }))
            );

            // Create 4 files newer than 7 days
            paths.push(
              ...(await createFakeLogFiles({
                count: 4,
                offset: today,
                basePath: customLogDir.path,
              }))
            );

            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              `mongosh:\n  logLocation: ${JSON.stringify(
                customLogDir.path
              )}\n  logRetentionDays: ${retentionDays}`
            );

            expect(await getFilesState(paths)).equals('1111111111');

            shell = this.startTestShell({
              args: ['--nodb'],
              env,
              globalConfigPath: globalConfig,
              forceTerminal: true,
            });

            await shell.waitForPrompt();

            // Add the newly created log file
            paths.push(path.join(customLogDir.path, getLogName(shell.logId)));

            await eventually(async () => {
              // Expect 6 files to be deleted and 5 to remain (including the new log file)
              expect(await getFilesState(paths)).equals('00000011111');
            });
          });
        });

        describe('with logMaxFileCount', function () {
          const customLogDir = useTmpdir();

          it('should only delete files with mongosh_ prefix in a custom location', async function () {
            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              `mongosh:\n  logLocation: ${JSON.stringify(
                customLogDir.path
              )}\n  logMaxFileCount: 2`
            );

            const paths: string[] = [];

            // Create 3 log files without mongosh_ prefix
            paths.push(
              ...(await createFakeLogFiles({
                count: 3,
                prefix: '',
                basePath: customLogDir.path,
              }))
            );

            // Create 4 log files with mongosh_ prefix
            paths.push(
              ...(await createFakeLogFiles({
                count: 3,
                prefix: 'mongosh_',
                basePath: customLogDir.path,
              }))
            );

            // All 7 existing log files exist.
            expect(await getFilesState(paths)).to.equal('111111');

            shell = this.startTestShell({
              args: ['--nodb'],
              env: {
                ...env,
                MONGOSH_TEST_ONLY_MAX_LOG_FILE_COUNT: '',
                MONGOSH_GLOBAL_CONFIG_FILE_FOR_TESTING: globalConfig,
              },
              forceTerminal: true,
            });

            await shell.waitForPrompt();

            paths.push(path.join(customLogDir.path, getLogName(shell.logId)));

            await eventually(async () => {
              // 3 log files without mongosh_ prefix should remain
              // 2 log file with mongosh_ prefix should be deleted
              // 2 log files with mongosh_ prefix should remain (including the new log)
              expect(await getFilesState(paths)).to.equal('1110011');
            });
          });

          it('should delete files once it is above logMaxFileCount', async function () {
            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              `mongosh:\n  logLocation: ${JSON.stringify(
                customLogDir.path
              )}\n  logMaxFileCount: 4`
            );

            // Create 10 log files
            const paths = await createFakeLogFiles({
              count: 10,
              basePath: customLogDir.path,
            });

            // All 10 existing log files exist.
            expect(await getFilesState(paths)).to.equal('1111111111');
            shell = this.startTestShell({
              args: ['--nodb'],
              env,
              globalConfigPath: globalConfig,
              forceTerminal: true,
            });

            await shell.waitForPrompt();

            // Add the newly created log to the file list.
            paths.push(path.join(customLogDir.path, getLogName(shell.logId)));

            expect(
              await shell.executeLine('config.get("logMaxFileCount")')
            ).contains('4');

            await eventually(async () => {
              // Expect 7 files to be deleted and 4 to remain (including the new log file)
              expect(await getFilesState(paths)).to.equal('00000001111');
            });
          });
        });

        describe('with logRetentionGB', function () {
          const customLogDir = useTmpdir();

          it('should delete files once it is above logRetentionGB', async function () {
            const globalConfig = path.join(homedir, 'globalconfig.conf');
            await fs.writeFile(
              globalConfig,
              // Set logRetentionGB to 4 MB and we will create prior 10 log files, 1 MB each
              `mongosh:\n  logLocation: ${JSON.stringify(
                customLogDir.path
              )}\n  logRetentionGB: ${4 / 1024}`
            );
            const paths: string[] = [];

            // Create 10 log files, around 1 mb each
            paths.push(
              ...(await createFakeLogFiles({
                count: 10,
                size: 1024 * 1024,
                basePath: customLogDir.path,
              }))
            );

            // All 10 existing log files exist.
            expect(await getFilesState(paths)).to.equal('1111111111');
            shell = this.startTestShell({
              args: ['--nodb'],
              env,
              globalConfigPath: globalConfig,
              forceTerminal: true,
            });

            await shell.waitForPrompt();

            // Add the newly created log to the file list.
            paths.push(path.join(customLogDir.path, getLogName(shell.logId)));

            expect(
              await shell.executeLine('config.get("logRetentionGB")')
            ).contains(`${4 / 1024}`);

            await eventually(async () => {
              // Expect 6 files to be deleted and 4 to remain
              // (including the new log file which should be <1 MB)
              expect(await getFilesState(paths)).to.equal('00000001111');
            });
          });
        });

        it('creates a log file that keeps track of session events', async function () {
          expect(await shell.executeLine('print(123 + 456)')).to.include('579');
          await eventually(async () => {
            const log = await readLogFile();
            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(123 + 456)'
              )
            ).to.have.lengthOf(1);
          });
        });

        it('does not write to the log after disableLogging is set to true', async function () {
          expect(await shell.executeLine('print(123 + 456)')).to.include('579');
          await eventually(async () => {
            const log = await readLogFile();
            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(123 + 456)'
              )
            ).to.have.lengthOf(1);
          });

          await shell.executeLine(`config.set("disableLogging", true)`);
          expect(await shell.executeLine('print(579 - 123)')).to.include('456');

          await eventually(async () => {
            const logAfterDisabling = await readLogFile();
            expect(
              logAfterDisabling.filter(
                (logEntry) => logEntry.attr?.input === 'print(579 - 123)'
              )
            ).to.have.lengthOf(0);
            expect(
              logAfterDisabling.filter(
                (logEntry) => logEntry.attr?.input === 'print(123 + 456)'
              )
            ).to.have.lengthOf(1);
          });
        });

        it('starts writing to the same log from the point where disableLogging is set to false', async function () {
          expect(await shell.executeLine('print(111 + 222)')).to.include('333');

          let log = await readLogFile();
          expect(
            log.filter(
              (logEntry) => logEntry.attr?.input === 'print(111 + 222)'
            )
          ).to.have.lengthOf(1);

          await shell.executeLine(`config.set("disableLogging", true)`);
          expect(await shell.executeLine('print(123 + 456)')).to.include('579');

          let oldLogId: string | null = null;

          await eventually(async () => {
            log = await readLogFile();
            oldLogId = shell.logId;
            expect(oldLogId).not.null;

            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(123 + 456)'
              )
            ).to.have.lengthOf(0);
          });

          await shell.executeLine(`config.set("disableLogging", false)`);

          expect(
            await shell.executeLine('config.get("disableLogging")')
          ).to.include('false');

          expect(await shell.executeLine('print(579 - 123)')).to.include('456');

          const newLogId = shell.logId;
          expect(newLogId).not.null;
          expect(oldLogId).equals(newLogId);

          await eventually(async () => {
            log = await readLogFile();

            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(111 + 222)'
              )
            ).to.have.lengthOf(1);
            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(579 - 123)'
              )
            ).to.have.lengthOf(1);
            expect(
              log.filter(
                (logEntry) => logEntry.attr?.input === 'print(123 + 456)'
              )
            ).to.have.lengthOf(0);
          });
        });

        it('includes information about the driver version', async function () {
          const connectionString = await testServer.connectionString();
          expect(
            await shell.executeLine(
              `connect(${JSON.stringify(connectionString)})`
            )
          ).to.include('test');
          await eventually(async () => {
            const log = await readLogFile();
            expect(
              log.filter(
                (logEntry) => typeof logEntry.attr?.driver?.version === 'string'
              )
            ).to.have.lengthOf(1);
          });
        });

        it('gets a path to the current log file', async function () {
          await shell.executeLine('log.getPath()');
          expect(shell.assertNoErrors());
          const logPath = path.join(logBasePath, `${shell.logId}_log`);
          expect(shell.output).to.include(logPath);
        });

        it('writes custom log directly', async function () {
          await shell.executeLine("log.info('This is a custom entry')");
          expect(shell.assertNoErrors());
          await eventually(async () => {
            const log = await readLogFile<
              MongoLogEntryFromFile & {
                c: string;
                ctx: string;
              }
            >();
            const customLogEntry = log.filter((logEntry) =>
              logEntry.msg.includes('This is a custom entry')
            );
            expect(customLogEntry).to.have.lengthOf(1);
            expect(customLogEntry[0].s).to.be.equal('I');
            expect(customLogEntry[0].c).to.be.equal('MONGOSH-SCRIPTS');
            expect(customLogEntry[0].ctx).to.be.equal('custom-log');
          });
        });

        it('writes custom log when loads a script', async function () {
          const connectionString = await testServer.connectionString();
          await shell.executeLine(
            `connect(${JSON.stringify(connectionString)})`
          );
          const filename = path.resolve(
            __dirname,
            'fixtures',
            'custom-log-info.js'
          );
          await shell.executeLine(`load(${JSON.stringify(filename)})`);
          expect(shell.assertNoErrors());
          await eventually(async () => {
            const log = await readLogFile();
            expect(
              log.filter((logEntry) =>
                logEntry.msg.includes('Initiating connection attemp')
              )
            ).to.have.lengthOf(1);
            expect(
              log.filter((logEntry) => logEntry.msg.includes('Hi there'))
            ).to.have.lengthOf(1);
          });
        });
      });

      describe('history file', function () {
        it('persists between sessions', async function () {
          await shell.executeLine('a = 42');
          shell.writeInput('.exit\n');
          await shell.waitForSuccessfulExit();

          shell = await startTestShell();
          // Arrow up twice to skip the .exit line
          shell.writeInput('\u001b[A\u001b[A');
          await eventually(() => {
            expect(shell.output).to.include('a = 42');
          });
          shell.writeInput('\n.exit\n');
          await shell.waitForSuccessfulExit();

          expect(await fs.readFile(historyPath, 'utf8')).to.match(/^a = 42$/m);
        });

        it('is only user-writable (on POSIX)', async function () {
          if (process.platform === 'win32') {
            return this.skip(); // No sensible fs permissions on Windows
          }

          await shell.executeLine('a = 42');
          shell.writeInput('.exit\n');
          await shell.waitForSuccessfulExit();

          expect((await fs.stat(historyPath)).mode & 0o077).to.equal(0);
        });

        // Security-relevant test -- description covered `history` package tests.
        it('redacts secrets', async function () {
          await shell.executeLine('db.auth("myusername", "mypassword")');
          await shell.executeLine('a = 42');
          await shell.executeLine('foo = "bar"');
          shell.writeInput('.exit\n');
          await shell.waitForAnyExit(); // db.auth() call fails because of --nodb

          const contents = await fs.readFile(historyPath, 'utf8');
          expect(contents).to.not.match(/mypassword/);
          expect(contents).to.match(/^a = 42$/m);
          expect(contents).to.match(/^foo = "bar"$/m);
        });
      });

      describe('mongoshrc', function () {
        beforeEach(async function () {
          await fs.writeFile(
            path.join(homedir, '.mongoshrc.js'),
            'print("hi from mongoshrc")'
          );
        });

        it('loads .mongoshrc.js if it is there', async function () {
          shell = await startTestShell();
          shell.assertContainsOutput('hi from mongoshrc');
        });

        it('does not load .mongoshrc.js if --norc is passed', async function () {
          shell = await startTestShell('--norc');
          shell.assertNotContainsOutput('hi from mongoshrc');
        });
      });

      describe('update notification', function () {
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

        it('shows an update notification if a newer version is available', async function () {
          {
            const shell = await startTestShell('--quiet');
            await shell.executeLine(
              `config.set("updateURL", ${JSON.stringify(httpServerUrl)})`
            );
            shell.writeInputLine('exit');
            await shell.waitForSuccessfulExit();
          }

          delete env.CI;
          delete env.IS_CI;
          env.MONGOSH_ASSUME_DIFFERENT_VERSION_FOR_UPDATE_NOTIFICATION_TEST =
            '1.0.0';
          {
            const shell = await startTestShell();
            await eventually(async () => {
              expect(
                JSON.parse(
                  await fs.readFile(
                    path.join(logBasePath, 'update-metadata.json'),
                    'utf-8'
                  )
                ).latestKnownMongoshVersion
              ).to.be.a('string');
            });
            shell.writeInputLine('exit');
            await shell.waitForSuccessfulExit();
          }

          {
            const shell = await startTestShell();
            shell.writeInputLine('exit');
            await shell.waitForSuccessfulExit();
            shell.assertContainsOutput(
              'mongosh 2023.4.15 is available for download: https://www.mongodb.com/try/download/shell'
            );
          }
        });
      });
    });

    context('in a restricted environment', function () {
      it('keeps working when the home directory cannot be created at all', async function () {
        await fs.writeFile(homedir, 'this is a file and not a directory');
        const shell = await startTestShell();
        await eventually(() => {
          expect(shell.output).to.include('Warning: Could not access file:');
        });
        expect(await shell.executeLine('print(123 + 456)')).to.include('579');
        await shell.executeLine('sleep(100)');
        expect(shell.output).to.not.include('anonymousId');
        expect(shell.output).to.not.include('AssertionError');
        expect(shell.assertNoErrors());
      });

      it('keeps working when the log files cannot be created', async function () {
        await fs.mkdir(path.dirname(logBasePath), { recursive: true });
        await fs.writeFile(logBasePath, 'also not a directory');
        const shell = await startTestShell();
        await eventually(() => {
          expect(shell.output).to.include('Warning: Could not access file:');
        });
        expect(await shell.executeLine('print(123 + 456)')).to.include('579');
        expect(await shell.executeLine('enableTelemetry()')).to.include(
          'Telemetry is now enabled'
        );
        await shell.executeLine('sleep(100)');
        expect(shell.output).to.not.include('anonymousId');
        expect(shell.output).to.not.include('AssertionError');
        expect(shell.assertNoErrors());
      });

      it('keeps working when the config file is present but not writable', async function () {
        if (
          process.platform === 'win32' ||
          process.getuid() === 0 ||
          process.geteuid() === 0
        ) {
          return this.skip(); // There is no meaningful chmod on Windows, and root can ignore permissions.
        }
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, '{}');
        await fs.chmod(configPath, 0); // Remove all permissions
        const shell = await startTestShell();
        await eventually(() => {
          expect(shell.output).to.include('Warning: Could not access file:');
        });
        expect(await shell.executeLine('print(123 + 456)')).to.include('579');
        await shell.executeLine('sleep(100)');
        expect(shell.output).to.not.include('anonymousId');
        expect(shell.output).to.not.include('AssertionError');
        expect(shell.assertNoErrors());
      });
    });
  });

  describe('versioned API', function () {
    let db: Db;
    let dbName: string;
    let client: MongoClient;

    beforeEach(async function () {
      dbName = `test-${Date.now()}`;

      client = await MongoClient.connect(
        await testServer.connectionString(),
        {}
      );
      db = client.db(dbName);
    });

    afterEach(async function () {
      await db.dropDatabase();
      await client.close();
    });

    context('pre-4.4', function () {
      skipIfServerVersion(testServer, '> 4.4');

      it('errors if an API version is specified', async function () {
        const shell = this.startTestShell({
          args: [
            await testServer.connectionString({}, { pathname: `/${dbName}` }),
            '--apiVersion',
            '1',
          ],
        });
        if ((await shell.waitForPromptOrExit()).state === 'prompt') {
          await shell.executeLine('db.coll.find().toArray()');
        }
        expect(shell.output).to.match(/MongoServer(Selection)?Error/);
      });
    });

    context('post-4.4', function () {
      skipIfServerVersion(testServer, '<= 4.4');

      it('can specify an API version', async function () {
        const shell = this.startTestShell({
          args: [
            await testServer.connectionString({}, { pathname: `/${dbName}` }),
            '--apiVersion',
            '1',
          ],
        });
        await shell.waitForPrompt();
        shell.assertContainsOutput('(API Version 1)');
        expect(await shell.executeLine('db.coll.find().toArray()')).to.include(
          '[]'
        );
        shell.assertNoErrors();
      });

      it('can specify an API version and strict mode', async function () {
        const shell = this.startTestShell({
          args: [
            await testServer.connectionString({}, { pathname: `/${dbName}` }),
            '--apiVersion',
            '1',
            '--apiStrict',
            '--apiDeprecationErrors',
          ],
        });
        await shell.waitForPrompt();
        shell.assertContainsOutput('(API Version 1)');
        expect(await shell.executeLine('db.coll.find().toArray()')).to.include(
          '[]'
        );
        shell.assertNoErrors();
      });

      it('can iterate cursors', async function () {
        // Make sure SERVER-55593 doesn't happen to us.
        const shell = this.startTestShell({
          args: [
            await testServer.connectionString({}, { pathname: `/${dbName}` }),
            '--apiVersion',
            '1',
          ],
        });
        await shell.waitForPrompt();
        await shell.executeLine(
          'for (let i = 0; i < 200; i++) db.coll.insert({i})'
        );
        await shell.executeLine(
          'const cursor = db.coll.find().limit(100).batchSize(10);'
        );
        expect(await shell.executeLine('cursor.toArray()')).to.include('i: 5');
        shell.assertNoErrors();
      });
    });
  });

  describe('fail-fast connections', function () {
    it('fails fast for ENOTFOUND errors', async function () {
      const shell = this.startTestShell({
        args: [
          'mongodb://' +
            'verymuchnonexistentdomainname'.repeat(4) +
            '.mongodb.net/',
        ],
      });
      const exitCode = await shell.waitForAnyExit();
      expect(exitCode).to.equal(1);
    });

    it('fails fast for ENOTFOUND/EINVAL errors', async function () {
      // Very long & nonexistent domain can result in EINVAL in Node.js >= 20.11
      // In lower versions, it would be ENOTFOUND
      const shell = this.startTestShell({
        args: [
          'mongodb://' +
            'verymuchnonexistentdomainname'.repeat(10) +
            '.mongodb.net/',
        ],
      });
      const exitCode = await shell.waitForAnyExit();
      expect(exitCode).to.equal(1);
    });

    it('fails fast for ECONNREFUSED errors to a single host', async function () {
      const shell = this.startTestShell({ args: ['--port', '1'] });
      const result = await shell.waitForPromptOrExit();
      expect(result).to.deep.equal({ state: 'exit', exitCode: 1 });
    });

    it('fails fast for ECONNREFUSED errors to multiple hosts', async function () {
      if (process.platform === 'darwin') {
        // On macOS, for some reason only connection that fails is the 127.0.0.1:1
        // one, over and over. It should be fine to only skip the test there, as this
        // isn't a shell-specific issue.
        return this.skip();
      }
      const shell = this.startTestShell({
        args: [
          'mongodb://127.0.0.1:1,127.0.0.2:1,127.0.0.3:1/?replicaSet=foo&readPreference=secondary',
        ],
      });
      const result = await shell.waitForPromptOrExit();
      expect(result).to.deep.equal({ state: 'exit', exitCode: 1 });
    });
  });

  describe('collection names with types', function () {
    let shell: TestShell;

    beforeEach(async function () {
      shell = this.startTestShell({
        args: [await testServer.connectionString()],
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    it('prints collections with their types', async function () {
      const dbName = `test-${Date.now()}`;

      await shell.executeLine(`use ${dbName};`);
      await shell.executeLine('db.coll1.insertOne({ foo: 123 });');
      expect(await shell.executeLine('show collections')).to.include('coll1');
    });

    context('post-5.0', function () {
      skipIfServerVersion(testServer, '< 5.0');

      it('prints collections with their types', async function () {
        const dbName = `test-${Date.now()}`;

        await shell.executeLine(`use ${dbName};`);
        await shell.executeLine("db.coll2.insertOne({ some: 'field' });");
        await shell.executeLine(
          "db.createCollection('coll3', { timeseries: { timeField: 'time' } } );"
        );

        const result = await shell.executeLine('show collections');

        expect(result).to.include('coll2');
        expect(result).to.include('coll3');
        expect(result).to.include('[time-series]');
      });
    });
  });

  describe('ask-for-connection-string mode', function () {
    let shell: TestShell;

    beforeEach(function () {
      shell = this.startTestShell({
        args: [],
        env: { ...process.env, MONGOSH_FORCE_CONNECTION_STRING_PROMPT: '1' },
        forceTerminal: true,
      });
    });

    it('allows connecting to a host and running commands against it', async function () {
      const connectionString = await testServer.connectionString();
      await eventually(() => {
        shell.assertContainsOutput('Please enter a MongoDB connection string');
      });
      shell.writeInputLine(connectionString);
      await shell.waitForPrompt();

      expect(await shell.executeLine('db.runCommand({ping: 1})')).to.include(
        'ok: 1'
      );

      shell.writeInputLine('exit');
      await shell.waitForSuccessfulExit();
      shell.assertNoErrors();
    });
  });

  describe('with incomplete loadBalanced connectivity', function () {
    it('prints a warning at startup', async function () {
      const shell = this.startTestShell({
        args: ['mongodb://localhost:1/?loadBalanced=true'],
      });
      await shell.waitForPrompt();
      shell.assertContainsOutput(
        'The server failed to respond to a ping and may be unavailable'
      );
      shell.assertContainsOutput('MongoNetworkError');
    });
  });

  describe('run Node.js scripts as-is', function () {
    it('runs Node.js scripts as they are when using MONGOSH_RUN_NODE_SCRIPT', async function () {
      const filename = path.resolve(
        __dirname,
        '..',
        '..',
        'e2e-tests',
        'test',
        'fixtures',
        'simple-console-log.js'
      );
      const shell = this.startTestShell({
        args: [filename],
        env: { ...process.env, MONGOSH_RUN_NODE_SCRIPT: '1' },
      });
      await shell.waitForSuccessfulExit();
      shell.assertContainsOutput('610');
    });
  });

  describe('currentOp', function () {
    context('with 2 shells', function () {
      let helperShell: TestShell;
      let currentOpShell: TestShell;

      const CURRENT_OP_WAIT_TIME = 400;
      const OPERATION_TIME = CURRENT_OP_WAIT_TIME * 2;

      beforeEach(async function () {
        helperShell = this.startTestShell({
          args: [await testServer.connectionString()],
        });
        currentOpShell = this.startTestShell({
          args: [await testServer.connectionString()],
        });
        await helperShell.waitForPrompt();
        await currentOpShell.waitForPrompt();

        // Insert a dummy object so find commands will actually run with the delay.
        await helperShell.executeLine('db.coll.insertOne({})');
      });

      it('should return the current operation and clear when it is complete', async function () {
        const currentCommand = helperShell.executeLine(
          `db.coll.find({$where: function() { sleep(${OPERATION_TIME}) }}).projection({testProjection: 1})`
        );
        helperShell.assertNoErrors();
        await sleep(CURRENT_OP_WAIT_TIME);
        let currentOpCall = await currentOpShell.executeLine(`db.currentOp()`);

        currentOpShell.assertNoErrors();

        expect(currentOpCall).to.include('testProjection');

        await currentCommand;

        currentOpCall = await currentOpShell.executeLine(`db.currentOp()`);

        currentOpShell.assertNoErrors();
        expect(currentOpCall).not.to.include('testProjection');
      });

      it('should work when the operation contains regex', async function () {
        const regExpString = String.raw`^(?i)\Qchho0842\E`;

        // Stringify the reg exp and drop the quotation marks.
        // Meant to account for JS escaping behavior and to compare with output later.
        const stringifiedRegExpString = `${JSON.stringify(regExpString)}`.slice(
          1,
          -1
        );

        void helperShell.executeLine(
          `db.coll.find({$where: function() { sleep(${OPERATION_TIME}) }}).projection({re: BSONRegExp('${stringifiedRegExpString}')})`
        );
        helperShell.assertNoErrors();

        await sleep(CURRENT_OP_WAIT_TIME);

        const currentOpCall = await currentOpShell.executeLine(
          `db.currentOp()`
        );
        currentOpShell.assertNoErrors();

        expect(currentOpCall).to.include(stringifiedRegExpString);
      });
    });
  });
});
