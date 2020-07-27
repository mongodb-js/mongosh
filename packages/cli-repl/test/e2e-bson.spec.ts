import {
  MongoClient,
  DBRef,
  MaxKey,
  MinKey,
  ObjectId,
  Symbol,
  Timestamp,
  Code,
  Decimal128,
  Binary
} from 'mongodb';
import { eventually } from './helpers';
import { TestShell } from './test-shell';
import {
  startTestServer
} from '../../../testing/integration-testing-hooks';

describe('BSON e2e', function() {
  const connectionString = startTestServer();

  afterEach(() => TestShell.killall());
  describe('with connection string', () => {
    let db;
    let client;
    let shell: TestShell;
    let dbName;

    beforeEach(async() => {
      dbName = `test-${Date.now()}`;
      shell = TestShell.start({ args: [connectionString] });

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
    // NOTE: the driver returns regular JS objects for Int32, Long
    it('ObjectId modified when returned from the server', async() => {
      const value = new ObjectId();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('DBRef modified when returned from the server', async() => {
      const value = new DBRef('coll', new ObjectId());
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MinKey modified when returned from the server', async() => {
      const value = new MinKey();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MaxKey modified when returned from the server', async() => {
      const value = new MaxKey();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Timestamp modified when returned from the server', async() => {
      const value = new Timestamp(0, 100);
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Symbol modified when returned from the server', async() => {
      const value = new Symbol('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Code modified when returned from the server', async() => {
      const value = new Code('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Decimal128 modified when returned from the server', async() => {
      const value = Decimal128.fromString('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Binary modified when returned from the server', async() => {
      const buffer = Buffer.from('MTIzNA==', 'base64');
      const value = new Binary(buffer, 128);
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('ObjectId modified when created by user', async() => {
      const value = 'new ObjectId()';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('DBRef modified when created by user', async() => {
      const value = 'new DBRef("namespace", "oid")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MinKey modified when created by user', async() => {
      const value = 'new MinKey()';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MaxKey modified when created by user', async() => {
      const value = 'new MaxKey()';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Timestamp modified when created by user', async() => {
      const value = 'new Timestamp(0, 100)';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Symbol modified when created by user', async() => {
      const value = 'new Symbol("1")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Code modified when created by user', async() => {
      const value = 'new Code("1")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Decimal128 modified when created by user', async() => {
      const value = 'NumberDecimal("1")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Binary modified when created by user', async() => {
      const value = 'new BinData(128, "MTIzNA==")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
  });
});

