import { MongoClient } from 'mongodb';
import { eventually } from './helpers';
import { TestShell } from './test-shell';

describe('e2e', function() {
  before(require('mongodb-runner/mocha/before')({ port: 27018, timeout: 60000 }));
  after(require('mongodb-runner/mocha/after')({ port: 27018 }));

  afterEach(() => TestShell.killall());

  describe('--version', () => {
    it('shows version', async() => {
      const shell = TestShell.start({ args: [ '--version' ] });

      await eventually(() => {
        shell.assertNoErrors();
        shell.assertContainsOutput(
          require('../package.json').version
        );
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
      const connectionString = `mongodb://localhost:27018/${dbName}`;
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

    it('throws multiline input with a single line string', async() => {
      // this is an unterminated string constant and should throw, since it does
      // not pass: https://www.ecma-international.org/ecma-262/#sec-line-terminators
      await shell.executeLine('"this is a multi\nline string');
      shell.assertContainsError('SyntaxError: Invalid or unexpected token');
    });

    it('throws when a syntax error is encountered', async() => {
      await shell.executeLine('<x');
      shell.assertContainsError('SyntaxError: Unexpected token \'<\'');
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
  });
});

