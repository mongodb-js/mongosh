/* eslint-disable no-control-regex */
import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { eventually } from '../../../testing/eventually';
import { TestShell } from './test-shell';
import {
  skipIfServerVersion,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import { promises as fs, createReadStream } from 'fs';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import { readReplLogfile, setTemporaryHomeDirectory } from './repl-helpers';
import { bson } from '@mongosh/service-provider-core';
import type { Server as HTTPServer } from 'http';
import { createServer as createHTTPServer } from 'http';
import { once } from 'events';
import type { AddressInfo } from 'net';
const { EJSON } = bson;

describe('e2e', function () {
  const testServer = startSharedTestServer();

  afterEach(TestShell.cleanup);

  describe('--version', function () {
    it('shows version', async function () {
      const shell = TestShell.start({ args: ['--version'] });
      await shell.waitForExit();

      shell.assertNoErrors();
      shell.assertContainsOutput(require('../package.json').version);
    });
  });

  describe('--build-info', function () {
    it('shows build info in JSON format', async function () {
      const shell = TestShell.start({ args: ['--build-info'] });
      await shell.waitForExit();

      shell.assertNoErrors();
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
    });

    it('provides build info via the buildInfo() builtin', async function () {
      const shell = TestShell.start({
        args: [
          '--quiet',
          '--eval',
          'JSON.stringify(buildInfo().deps)',
          '--nodb',
        ],
      });
      await shell.waitForExit();
      shell.assertNoErrors();
      const deps = JSON.parse(shell.output);
      expect(deps.nodeDriverVersion).to.be.a('string');
      expect(deps.libmongocryptVersion).to.be.a('string');
      expect(deps.libmongocryptNodeBindingsVersion).to.be.a('string');
    });
  });

  describe('--nodb', function () {
    let shell: TestShell;
    beforeEach(async function () {
      shell = TestShell.start({
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
      shell = TestShell.start({
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
      const onExit = shell.waitForExit();
      shell.writeInputLine('exit');
      expect(await onExit).to.equal(0);
    });
    it('closes the shell when "quit" is entered', async function () {
      const onExit = shell.waitForExit();
      shell.writeInputLine('quit');
      expect(await onExit).to.equal(0);
    });
    it('closes the shell with the specified exit code when "exit(n)" is entered', async function () {
      const onExit = shell.waitForExit();
      shell.writeInputLine('exit(42)');
      expect(await onExit).to.equal(42);
    });
    it('closes the shell with the specified exit code when "quit(n)" is entered', async function () {
      const onExit = shell.waitForExit();
      shell.writeInputLine('quit(42)');
      expect(await onExit).to.equal(42);
    });
    it('closes the shell with the pre-specified exit code when "exit" is entered', async function () {
      const onExit = shell.waitForExit();
      shell.writeInputLine('process.exitCode = 42; exit()');
      expect(await onExit).to.equal(42);
    });
    it('closes the shell with the pre-specified exit code when "quit" is entered', async function () {
      const onExit = shell.waitForExit();
      shell.writeInputLine('process.exitCode = 42; quit()');
      expect(await onExit).to.equal(42);
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
      shell = TestShell.start({
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
      shell = TestShell.start({
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
            shell = TestShell.start({
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
            shell = TestShell.start({
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
            shell = TestShell.start({ args: [dbname, `--port=${port}`] });
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
            shell = TestShell.start({
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
      let shell;
      beforeEach(async function () {
        shell = TestShell.start({
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
        const { version } = require('../package.json');
        expect(currentOp).to.include(`appName: 'mongosh ${version}'`);
        expect(currentOp).to.include("name: 'nodejs|mongosh'");
        shell.assertNoErrors();
      });
    });

    context('with custom appName', function () {
      let shell;
      beforeEach(async function () {
        shell = TestShell.start({
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
    let db;
    let client;
    let shell: TestShell;
    let dbName;

    beforeEach(async function () {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;
      shell = TestShell.start({ args: [connectionString] });

      client = await MongoClient.connect(connectionString, {});

      db = client.db(dbName);

      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    afterEach(async function () {
      await db.dropDatabase();

      client.close();
    });

    it('version', async function () {
      const expected = require('../package.json').version;
      await shell.executeLine('version()');
      shell.assertContainsOutput(expected);
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
      shell = TestShell.start({
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

    describe('non-interactive', function () {
      it('interrupts file execution', async function () {
        const filename = path.resolve(
          __dirname,
          'fixtures',
          'load',
          'long-sleep.js'
        );
        const shell = TestShell.start({
          args: ['--nodb', filename],
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

    describe('interactive', function () {
      let shell: TestShell;
      beforeEach(async function () {
        shell = TestShell.start({
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
    let shell;
    beforeEach(async function () {
      shell = TestShell.start({ args: ['--nodb'] });
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
      shell = TestShell.start({ args: [await testServer.connectionString()] });
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
  });

  describe('Node.js builtin APIs in the shell', function () {
    let shell;
    beforeEach(async function () {
      shell = TestShell.start({
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

  describe('files loaded from command line', function () {
    context('file from disk', function () {
      it('loads a file from the command line as requested', async function () {
        const shell = TestShell.start({
          args: ['--nodb', './hello1.js'],
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
        await shell.waitForExit();
        shell.assertNoErrors();
      });

      it('drops into shell if --shell is used', async function () {
        const shell = TestShell.start({
          args: ['--nodb', '--shell', './hello1.js'],
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
        const shell = TestShell.start({
          args: ['--nodb', '--shell', './throw.js'],
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
        expect(await shell.waitForExit()).to.equal(1);
      });
    });

    context('--eval', function () {
      const script = 'const a = "hello", b = " one"; a + b';
      it('loads a script from the command line as requested', async function () {
        const shell = TestShell.start({
          args: ['--nodb', '--eval', script],
        });
        await eventually(() => {
          shell.assertContainsOutput('hello one');
        });
        expect(await shell.waitForExit()).to.equal(0);
        shell.assertNoErrors();
      });

      it('drops into shell if --shell is used', async function () {
        const shell = TestShell.start({
          args: ['--nodb', '--eval', script, '--shell'],
        });
        await shell.waitForPrompt();
        shell.assertContainsOutput('hello one');
        expect(await shell.executeLine('2 ** 16 + 1')).to.include('65537');
        shell.assertNoErrors();
      });

      it('fails with the error if the loaded script throws', async function () {
        const shell = TestShell.start({
          args: ['--nodb', '--eval', 'throw new Error("uh oh")'],
        });
        await eventually(() => {
          shell.assertContainsOutput('Error: uh oh');
        });
        expect(await shell.waitForExit()).to.equal(1);
      });
    });
  });

  describe('config, logging and rc file', function () {
    let homedir: string;
    let env: Record<string, string>;
    let shell: TestShell;
    let configPath: string;
    let logBasePath: string;
    let logPath: string;
    let historyPath: string;
    let readConfig: () => Promise<any>;
    let readLogfile: () => Promise<any[]>;
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
      readLogfile = async () => readReplLogfile(logPath);
      startTestShell = async (...extraArgs: string[]) => {
        const shell = TestShell.start({
          args: ['--nodb', ...extraArgs],
          env: env,
          forceTerminal: true,
        });
        await shell.waitForPrompt();
        shell.assertNoErrors();
        return shell;
      };
    });

    afterEach(async function () {
      await TestShell.killall.call(this);
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
        logPath = path.join(logBasePath, `${shell.logId}_log`);
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
          shell = TestShell.start({
            args: ['--nodb'],
            env: {
              ...env,
              MONGOSH_GLOBAL_CONFIG_FILE_FOR_TESTING: globalConfig,
            },
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
      });

      describe('log file', function () {
        it('creates a log file that keeps track of session events', async function () {
          expect(await shell.executeLine('print(123 + 456)')).to.include('579');
          await eventually(async () => {
            const log = await readLogfile();
            expect(
              log.filter((logEntry) => /Evaluating input/.test(logEntry.msg))
            ).to.have.lengthOf(1);
          });
        });

        it('includes information about the driver version', async function () {
          const connectionString = await testServer.connectionString();
          expect(
            await shell.executeLine(
              `connect(${JSON.stringify(connectionString)})`
            )
          ).to.include('test');
          const log = await readLogfile();
          expect(
            log.filter(
              (logEntry) => typeof logEntry.attr?.driver?.version === 'string'
            )
          ).to.have.lengthOf(1);
        });
      });

      describe('history file', function () {
        it('persists between sessions', async function () {
          if (process.arch === 's390x') {
            return this.skip(); // https://jira.mongodb.org/browse/MONGOSH-746
          }
          await shell.executeLine('a = 42');
          shell.writeInput('.exit\n');
          await shell.waitForExit();

          shell = await startTestShell();
          // Arrow up twice to skip the .exit line
          shell.writeInput('\u001b[A\u001b[A');
          await eventually(() => {
            expect(shell.output).to.include('a = 42');
          });
          shell.writeInput('\n.exit\n');
          await shell.waitForExit();

          expect(await fs.readFile(historyPath, 'utf8')).to.match(/^a = 42$/m);
        });

        it('is only user-writable (on POSIX)', async function () {
          if (process.platform === 'win32') {
            return this.skip(); // No sensible fs permissions on Windows
          }

          await shell.executeLine('a = 42');
          shell.writeInput('.exit\n');
          await shell.waitForExit();

          expect((await fs.stat(historyPath)).mode & 0o077).to.equal(0);
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
            await shell.waitForExit();
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
            await shell.waitForExit();
          }

          {
            const shell = await startTestShell();
            shell.writeInputLine('exit');
            await shell.waitForExit();
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
    let db;
    let dbName;
    let client;

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
      client.close();
    });

    context('pre-4.4', function () {
      skipIfServerVersion(testServer, '> 4.4');

      it('errors if an API version is specified', async function () {
        const shell = TestShell.start({
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
        const shell = TestShell.start({
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
        const shell = TestShell.start({
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
        const shell = TestShell.start({
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
      const shell = TestShell.start({
        args: [
          'mongodb://' +
            'verymuchnonexistentdomainname'.repeat(10) +
            '.mongodb.net/',
        ],
      });
      const exitCode = await shell.waitForExit();
      expect(exitCode).to.equal(1);
    });

    it('fails fast for ECONNREFUSED errors to a single host', async function () {
      const shell = TestShell.start({ args: ['--port', '1'] });
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
      const shell = TestShell.start({
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
      shell = TestShell.start({ args: [await testServer.connectionString()] });
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
      shell = TestShell.start({
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
      await shell.waitForExit();
      shell.assertNoErrors();
    });
  });

  describe('with incomplete loadBalanced connectivity', function () {
    it('prints a warning at startup', async function () {
      const shell = TestShell.start({
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
        'cli-repl',
        'test',
        'fixtures',
        'simple-console-log.js'
      );
      const shell = TestShell.start({
        args: [filename],
        env: { ...process.env, MONGOSH_RUN_NODE_SCRIPT: '1' },
      });
      expect(await shell.waitForExit()).to.equal(0);
      shell.assertContainsOutput('610');
    });
  });
});
