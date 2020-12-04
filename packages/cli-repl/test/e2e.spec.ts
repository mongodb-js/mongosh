/* eslint-disable no-control-regex */
import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { eventually } from './helpers';
import { TestShell } from './test-shell';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import { promises as fs, createReadStream } from 'fs';
import { promisify } from 'util';
import rimraf from 'rimraf';
import path from 'path';
import { readReplLogfile } from './repl-helpers';

describe('e2e', function() {
  const testServer = startTestServer('shared');

  afterEach(async() => await TestShell.killall());

  describe('--version', () => {
    it('shows version', async() => {
      const shell = TestShell.start({ args: [ '--version' ] });

      await shell.waitForExit();

      shell.assertNoErrors();
      shell.assertContainsOutput(
        require('../package.json').version
      );
    });
  });

  describe('--nodb', () => {
    let shell;
    beforeEach(async() => {
      shell = TestShell.start({
        args: [ '--nodb' ]
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('db throws', async() => {
      await shell.executeLine('db');
      shell.assertContainsError('MongoshInvalidInputError: [SHAPI-10004] No connected database');
    });
    it('show dbs throws InvalidInput', async() => {
      await shell.executeLine('show dbs');
      shell.assertContainsError('MongoshInvalidInputError: [SHAPI-10004] No connected database');
    });
    it('db.coll.find() throws InvalidInput', async() => {
      await shell.executeLine('db.coll.find()');
      shell.assertContainsError('MongoshInvalidInputError: [SHAPI-10004] No connected database');
      // We're seeing the prompt and not a stack trace.
      expect(shell.output).to.include('No connected database\n> ');
    });
    it('colorizes syntax errors', async() => {
      shell = TestShell.start({
        args: [ '--nodb' ],
        env: { ...process.env, FORCE_COLOR: 'true', TERM: 'xterm-256color' },
        forceTerminal: true
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();

      await shell.executeLine('<cat>\n');
      await eventually(() => {
        expect(shell.rawOutput).to.match(/SyntaxError(\x1b\[.*m)+: Unexpected token/);
        expect(shell.rawOutput).to.match(/>(\x1b\[.*m)+ 1 \| (\x1b\[.*m)+<(\x1b\[.*m)+cat(\x1b\[.*m)+>(\x1b\[.*m)+/);
      });
    });
  });

  describe('set db', () => {
    describe('via host:port/test', () => {
      let shell;
      beforeEach(async() => {
        shell = TestShell.start({ args: [`${await testServer.hostport()}/testdb1`] });
        await shell.waitForPrompt();
        shell.assertNoErrors();
      });
      it('db set correctly', async() => {
        await shell.executeLine('db');
        shell.assertNoErrors();

        await eventually(() => {
          shell.assertContainsOutput('testdb1');
        });
      });
    });
    describe('via mongodb://uri', () => {
      let shell;
      beforeEach(async() => {
        shell = TestShell.start({ args: [`mongodb://${await testServer.hostport()}/testdb2`] });
        await shell.waitForPrompt();
        shell.assertNoErrors();
      });
      it('db set correctly', async() => {
        await shell.executeLine('db');
        shell.assertNoErrors();

        await eventually(() => {
          shell.assertContainsOutput('testdb2');
        });
      });
    });
    describe('legacy db only', () => {
      let shell;
      beforeEach(async() => {
        const port = await testServer.port();
        shell = TestShell.start({ args: ['testdb3', `--port=${port}`] });
        await shell.waitForPrompt();
        shell.assertNoErrors();
      });
      it('db set correctly', async() => {
        await shell.executeLine('db');
        shell.assertNoErrors();

        await eventually(() => {
          shell.assertContainsOutput('testdb3');
        });
      });
    });
  });

  describe('with connection string', () => {
    let db;
    let client;
    let shell: TestShell;
    let dbName;

    beforeEach(async() => {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;
      shell = TestShell.start({ args: [ connectionString ] });

      client = await (MongoClient as any).connect(
        connectionString,
        { useNewUrlParser: true }
      );

      db = client.db(dbName);

      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    afterEach(async() => {
      await db.dropDatabase();

      client.close();
    });

    it('version', async() => {
      const expected = require('../package.json').version;
      await shell.executeLine('version()');
      shell.assertContainsOutput(expected);
    });

    describe('error formatting', () => {
      it('throws when a syntax error is encountered', async() => {
        await shell.executeLine('<x');
        shell.assertContainsError('SyntaxError: Unexpected token');
      });
      it('throws a runtime error', async() => {
        await shell.executeLine('throw new Error(\'a errmsg\')');
        shell.assertContainsError('Error: a errmsg');
      });
      it('recognizes a driver error as error', async() => {
        await shell.executeLine('db.coll.initializeOrderedBulkOp().find({}).update({}, {}).execute()');
        // output varies by server version
        expect(shell.output).to.match(
          /multi update (only works with \$ operators|is not supported for replacement-style update)/);
      });
    });
    it('throws multiline input with a single line string', async() => {
      // this is an unterminated string constant and should throw, since it does
      // not pass: https://www.ecma-international.org/ecma-262/#sec-line-terminators
      await shell.executeLine('"this is a multi\nline string');
      shell.assertContainsError('SyntaxError: Unterminated string constant');
    });

    describe('literals', async() => {
      it('number', async() => {
        await shell.executeLine('1');
        shell.assertNoErrors();

        await eventually(() => {
          shell.assertContainsOutput('1');
        });
        it('string', async() => {
          await shell.executeLine('"string"');
          shell.assertNoErrors();

          await eventually(() => {
            shell.assertContainsOutput('string');
          });
        });
        it('undefined', async() => {
          await shell.executeLine('undefined');
          shell.assertNoErrors();
        });
        it('null', async() => {
          await shell.executeLine('null');
          shell.assertNoErrors();

          await eventually(() => {
            shell.assertContainsOutput('1');
          });
        });
        it('bool', async() => {
          await shell.executeLine('true');
          shell.assertNoErrors();

          await eventually(() => {
            shell.assertContainsOutput('true');
          });
        });
      });
    });
    it('runs an unterminated function', async() => {
      await shell.writeInputLine('function x () {\nconsole.log(\'y\')\n }');
      shell.assertNoErrors();
    });

    it('runs an unterminated function', async() => {
      await shell.writeInputLine('function x () {');
      shell.assertNoErrors();
    });

    it('runs help command', async() => {
      await shell.executeLine('help');

      await eventually(() => {
        shell.assertContainsOutput('Shell Help');
      });

      shell.assertNoErrors();
    });

    it('db set correctly', async() => {
      await shell.executeLine('db');
      shell.assertNoErrors();

      await eventually(() => {
        shell.assertContainsOutput('test');
      });
    });

    it('allows to find documents', async() => {
      await shell.writeInputLine(`use ${dbName}`);

      await db.collection('test').insertMany([
        { doc: 1 },
        { doc: 2 },
        { doc: 3 }
      ]);

      await shell.writeInputLine('db.test.find()');

      await eventually(() => {
        shell.assertContainsOutput('doc: 1');
        shell.assertContainsOutput('doc: 2');
        shell.assertContainsOutput('doc: 3');
      });
      shell.assertNotContainsOutput('CursorIterationResult');

      shell.assertNoErrors();
    });

    it('allows collections with .', async() => {
      await shell.writeInputLine(`use ${dbName}`);

      await db.collection('test.dot').insertMany([
        { doc: 1 },
        { doc: 2 },
        { doc: 3 }
      ]);

      await shell.writeInputLine('db.test.dot.find()');

      await eventually(() => {
        shell.assertContainsOutput('doc: 1');
        shell.assertContainsOutput('doc: 2');
        shell.assertContainsOutput('doc: 3');
      });

      shell.assertNoErrors();
    });

    it('rewrites async for collections with .', async() => {
      await shell.writeInputLine(`use ${dbName}`);
      await shell.writeInputLine('const x = db.test.dot.insertOne({ d: 1 })');
      await shell.writeInputLine('x.insertedId');

      await eventually(() => {
        shell.assertContainsOutput('ObjectId');
      });

      shell.assertNoErrors();
    });

    it('rewrites async for collections in the same statement', async() => {
      await shell.writeInputLine(`use ${dbName}`);
      await shell.writeInputLine('db.test.insertOne({ d: 1 }).acknowledged');

      await eventually(() => {
        shell.assertContainsOutput('true');
      });

      shell.assertNoErrors();
    });
  });

  describe('Ctrl+C aka SIGINT', () => {
    before(function() {
      if (process.platform === 'win32') {
        this.skip(); // There is no SIGINT on Windows.
      }
    });

    let shell;
    beforeEach(async() => {
      shell = TestShell.start({ args: [ '--nodb' ], removeSigintListeners: true });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('interrupts sync execution', async() => {
      await shell.executeLine('void process.removeAllListeners("SIGINT")');
      const result = shell.executeLine('while(true);');
      setTimeout(() => shell.kill('SIGINT'), 1000);
      await result;
      shell.assertContainsError('interrupted');
    });
    it('interrupts async awaiting', async() => {
      const result = shell.executeLine('new Promise(() => {});');
      setTimeout(() => shell.kill('SIGINT'), 1000);
      await result;
      shell.assertContainsError('interrupted');
    });
    it('behaves normally after an exception', async() => {
      await shell.executeLine('throw new Error()');
      await new Promise((resolve) => setTimeout(resolve, 100));
      shell.kill('SIGINT');
      await shell.waitForPrompt();
      await new Promise((resolve) => setTimeout(resolve, 100));
      shell.assertNotContainsOutput('interrupted');
    });
  });

  describe('printing', () => {
    let shell;
    beforeEach(async() => {
      shell = TestShell.start({ args: [ '--nodb' ] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('console.log() prints output exactly once', async() => {
      const result = await shell.executeLine('console.log(42);');
      expect(result).to.match(/\b42\b/);
      expect(result).not.to.match(/\b42[\s\r\n]*42\b/);
    });
    it('print() prints output exactly once', async() => {
      const result = await shell.executeLine('print(42);');
      expect(result).to.match(/\b42\b/);
      expect(result).not.to.match(/\b42[\s\r\n]*42\b/);
    });
  });

  describe('pipe from stdin', () => {
    let shell: TestShell;
    beforeEach(async() => {
      shell = TestShell.start({ args: [ await testServer.connectionString() ] });
    });

    it('reads and runs code from stdin, with .write()', async() => {
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

    it('reads and runs code from stdin, with .end()', async() => {
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

    it('reads and runs the vscode extension example playground', async() => {
      createReadStream(path.resolve(__dirname, 'fixtures', 'exampleplayground.js'))
        .pipe(shell.process.stdin);
      await eventually(() => {
        shell.assertContainsOutput("{ _id: 'xyz', totalSaleAmount: 150 }");
      });
    });
  });

  describe('Node.js builtin APIs in the shell', () => {
    let shell;
    beforeEach(async() => {
      shell = TestShell.start({
        args: [ '--nodb' ],
        cwd: path.resolve(__dirname, 'fixtures', 'require-base'),
        env: {
          ...process.env,
          NODE_PATH: path.resolve(__dirname, 'fixtures', 'node-path')
        }
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    it('require() searches the current working directory according to Node.js rules', async() => {
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

    it('Can use Node.js APIs without any extra effort', async() => {
      // Too lazy to write a fixture
      const result = await shell.executeLine(
        `fs.readFileSync(${JSON.stringify(__filename)}, 'utf8')`);
      expect(result).to.include('Too lazy to write a fixture');
    });
  });

  describe('config and logging', async() => {
    let shell: TestShell;
    let homedir: string;
    let mongoshdir: string;
    let configPath: string;
    let logPath: string;
    let historyPath: string;
    let readConfig: () => Promise<any>;
    let readLogfile: () => Promise<any[]>;
    let startTestShell: () => Promise<TestShell>;

    beforeEach(async() => {
      homedir = path.resolve(
        __dirname, '..', '..', '..', 'tmp', `cli-repl-home-${Date.now()}-${Math.random()}`);
      await fs.mkdir(homedir, { recursive: true });
      mongoshdir = path.resolve(homedir, '.mongodb', 'mongosh');
      configPath = path.resolve(mongoshdir, 'config');
      historyPath = path.resolve(mongoshdir, '.mongosh_repl_history');
      readConfig = async() => JSON.parse(await fs.readFile(configPath, 'utf8'));
      readLogfile = async() => readReplLogfile(logPath);
      startTestShell = async() => {
        const shell = TestShell.start({
          args: [ '--nodb' ],
          env: { ...process.env, HOME: homedir, USERPROFILE: homedir },
          forceTerminal: true
        });
        await shell.waitForPrompt();
        shell.assertNoErrors();
        return shell;
      };
      shell = await startTestShell();
      logPath = path.join(mongoshdir, `${shell.logId}_log`);
    });

    afterEach(async() => {
      await TestShell.killall();
      try {
        await promisify(rimraf)(homedir);
      } catch (err) {
        // On Windows in CI, this can fail with EPERM for some reason.
        // If it does, just log the error instead of failing all tests.
        console.error('Could not remove fake home directory:', err);
      }
    });

    describe('config file', async() => {
      it('sets up a config file', async() => {
        const config = await readConfig();
        expect(config.userId).to.match(/^[a-f0-9]{24}$/);
        expect(config.enableTelemetry).to.be.true;
        expect(config.disableGreetingMessage).to.be.false;
      });

      it('persists between sessions', async() => {
        const config1 = await readConfig();
        await startTestShell();
        const config2 = await readConfig();
        expect(config1.userId).to.equal(config2.userId);
      });
    });

    describe('telemetry toggling', () => {
      it('enableTelemetry() yields a success response', async() => {
        await shell.executeLine('enableTelemetry()');
        await eventually(() => {
          expect(shell.output).to.include('Telemetry is now enabled');
        });
        expect((await readConfig()).enableTelemetry).to.equal(true);
      });
      it('disableTelemetry() yields a success response', async() => {
        await shell.executeLine('disableTelemetry();');
        await eventually(() => {
          expect(shell.output).to.include('Telemetry is now disabled');
        });
        expect((await readConfig()).enableTelemetry).to.equal(false);
      });
    });

    describe('log file', () => {
      it('creates a log file that keeps track of session events', async() => {
        await shell.executeLine('print(123 + 456)');
        await eventually(() => {
          expect(shell.output).to.include('579');
        });
        const log = await readLogfile();
        expect(log.filter(logEntry => /rewritten-async-input/.test(logEntry.msg)))
          .to.have.lengthOf(1);
      });
    });

    describe('history file', () => {
      it('persists between sessions', async() => {
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
    });
  });
});

