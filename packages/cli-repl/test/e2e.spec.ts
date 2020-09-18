import { MongoClient } from 'mongodb';
import { eventually } from './helpers';
import { TestShell } from './test-shell';
import {
  startTestServer,
  LOCAL_INSTANCE_HOST,
  LOCAL_INSTANCE_PORT
} from '../../../testing/integration-testing-hooks';

describe('e2e', function() {
  const connectionString = startTestServer();

  afterEach(() => TestShell.killall());

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
      shell = TestShell.start({ args: [ '--nodb' ] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('db throws', async() => {
      await shell.executeLine('db');
      shell.assertContainsError('MongoshInvalidInputError: No connected database');
    });
    it('show dbs throws InvalidInput', async() => {
      await shell.executeLine('show dbs');
      shell.assertContainsError('MongoshInvalidInputError: No connected database');
    });
    it('db.coll.find() throws InvalidInput', async() => {
      await shell.executeLine('db.coll.find()');
      shell.assertContainsError('MongoshInvalidInputError: No connected database');
    });
  });

  describe('set db', () => {
    describe('via host:port/test', () => {
      let shell;
      beforeEach(async() => {
        shell = TestShell.start({ args: [`${LOCAL_INSTANCE_HOST}:${LOCAL_INSTANCE_PORT}/testdb1`] });
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
        shell = TestShell.start({ args: [`mongodb://${LOCAL_INSTANCE_HOST}:${LOCAL_INSTANCE_PORT}/testdb2`] });
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
        shell = TestShell.start({ args: ['testdb3', `--port=${LOCAL_INSTANCE_PORT}`] });
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
      dbName = `test-${Date.now()}`;
      shell = TestShell.start({ args: [ connectionString ] });

      client = await (MongoClient as any).connect(
        connectionString,
        { useNewUrlParser: true, useUnifiedTopology: true }
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
        shell.assertContainsOutput('multi update is not supported for replacement-style update');
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
  });

  describe('Ctrl+C aka SIGINT', () => {
    before(function() {
      if (process.platform === 'win32') {
        this.skip(); // There is no SIGINT on Windows.
      }
    });

    let shell;
    beforeEach(async() => {
      shell = TestShell.start({ args: [ '--nodb' ] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
    });
    it('interrupts sync execution', async() => {
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
});

