import {
  MongoClient
} from 'mongodb';
import {
  DBRef,
  MaxKey,
  MinKey,
  ObjectId,
  Symbol,
  Timestamp,
  Code,
  Decimal128,
  Binary
} from 'bson';
import { eventually } from './helpers';
import { TestShell } from './test-shell';
import {
  startTestServer
} from '../../../testing/integration-testing-hooks';

describe('BSON e2e', function() {
  const connectionString = startTestServer();

  afterEach(() => TestShell.killall());
  describe('printed BSON', () => {
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
    it('Entire doc prints when returned from the server', async() => {
      const buffer = Buffer.from('MTIzNA==', 'base64');
      const inputDoc = {
        ObjectId: new ObjectId('5f16b8bebe434dc98cdfc9ca'),
        DBRef: new DBRef('a', 'o'),
        MinKey: new MinKey(),
        MaxKey: new MaxKey(),
        // NumberInt: NumberInt(32),
        // NumberLong: NumberLong("64"),
        Timestamp: new Timestamp(1, 100),
        Symbol: new Symbol('abc'),
        Code: new Code('abc'),
        NumberDecimal: Decimal128.fromString('1'),
        BinData: new Binary(buffer, 128)
      };
      const outputDoc = {
        ObjectId: 'ObjectId("5f16b8bebe434dc98cdfc9ca")',
        DBRef: 'DBRef("a", "o")',
        MinKey: '{ "$minKey" : 1 }',
        MaxKey: '{ "$maxKey" : 1 }',
        NumberInt: 'NumberInt(32)',
        NumberLong: 'NumberLong("64")',
        Timestamp: 'Timestamp(1, 100)',
        Symbol: '"abc"',
        Code: '{ "code" : "abc" }',
        NumberDecimal: 'NumberDecimal("1")',
        BinData: 'BinData(128, "1234")'
      };
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne(inputDoc);
      await shell.writeInputLine('db.test.findOne()');
      await eventually(() => {
        shell.assertContainsOutput(outputDoc.ObjectId);
      });
      shell.assertNoErrors();
    });
    it('ObjectId prints when returned from the server', async() => {
      const value = 'ObjectId("5f16b8bebe434dc98cdfc9ca")';
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput(value);
      });
      shell.assertNoErrors();
    });
    it('DBRef prints when returned from the server', async() => {
      const value = new DBRef('coll', new ObjectId('5f16b8bebe434dc98cdfc9ca'));
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('DBRef("coll", ObjectId("5f16b8bebe434dc98cdfc9ca"))');
      });
      shell.assertNoErrors();
    });
    it('MinKey prints when returned from the server', async() => {
      const value = new MinKey();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('{ "$minKey" : 1 }');
      });
      shell.assertNoErrors();
    });
    it('MaxKey prints when returned from the server', async() => {
      const value = new MaxKey();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('{ "$maxKey" : 1 }');
      });
      shell.assertNoErrors();
    });
    it('Timestamp prints when returned from the server', async() => {
      const value = new Timestamp(0, 100);
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('Timestamp(0, 100)');
      });
      shell.assertNoErrors();
    });
    it('Symbol prints when returned from the server', async() => {
      const value = new Symbol('abc');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('"abc"');
      });
      shell.assertNoErrors();
    });
    it('Code prints when returned from the server', async() => {
      const value = new Code('abc');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('{ "code" : "abc" }');
      });
      shell.assertNoErrors();
    });
    it('Decimal128 prints when returned from the server', async() => {
      const value = Decimal128.fromString('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('NumberDecimal("1")');
      });
      shell.assertNoErrors();
    });
    it('BinData prints when returned from the server', async() => {
      const buffer = Buffer.from('MTIzNA==', 'base64');
      const value = new Binary(buffer, 128);
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value');
      await eventually(() => {
        shell.assertContainsOutput('BinData(128, "1234")');
      });
      shell.assertNoErrors();
    });
    it('ObjectId prints when created by user', async() => {
      const value = 'ObjectId("5f16b8bebe434dc98cdfc9ca")';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput(value);
      });
      shell.assertNoErrors();
    });
    it('DBRef prints when created by user', async() => {
      const value = 'DBRef("coll", ObjectId("5f16b8bebe434dc98cdfc9ca"))';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput(value);
      });
      shell.assertNoErrors();
    });
    it('MaxKey prints when created by user', async() => {
      const value = 'new MaxKey()';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('{ "$maxKey" : 1 }');
      });
      shell.assertNoErrors();
    });
    it('MinKey prints when created by user', async() => {
      const value = 'new MinKey()';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('{ "$minKey" : 1 }');
      });
      shell.assertNoErrors();
    });
    it('NumberInt prints when created by user', async() => {
      const value = 'NumberInt(32.5)';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('NumberInt(32)');
      });
      shell.assertNoErrors();
    });
    it('NumberLong prints when created by user', async() => {
      const value = 'NumberLong("64")';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('NumberLong(64)');
      });
      shell.assertNoErrors();
    });
    it('Timestamp prints when created by user', async() => {
      const value = 'Timestamp(0, 100)';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput(value);
      });
      shell.assertNoErrors();
    });
    it('Symbol prints when created by user', async() => {
      const value = 'new Symbol("symbol")';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('"symbol"');
      });
      shell.assertNoErrors();
    });
    it('Code prints when created by user', async() => {
      const value = 'new Code("abc")';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('{ "code" : "abc" }');
      });
      shell.assertNoErrors();
    });
    it('Code with scope prints when created by user', async() => {
      const value = 'new Code("abc", { s: 1 })';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('{ "code" : "abc", "scope" : {"s":1} }');
      });
      shell.assertNoErrors();
    });
    it('Decimal128 prints when created by user', async() => {
      const value = 'NumberDecimal(100)';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('NumberDecimal("100")');
      });
      shell.assertNoErrors();
    });
    // NOTE this is a slight change from the old shell, since the old shell just
    // printed the raw input, while this one converts it to a string.
    it('BinData prints when created by user', async() => {
      const value = 'BinData(128, "MTIzNA==")';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('BinData(128, "1234")');
      });
      shell.assertNoErrors();
    });
  });
  describe('help methods', () => {
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
    it('ObjectId has help when returned from the server', async() => {
      const value = new ObjectId();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('DBRef has help when returned from the server', async() => {
      const value = new DBRef('coll', new ObjectId());
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MinKey has help when returned from the server', async() => {
      const value = new MinKey();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MaxKey has help when returned from the server', async() => {
      const value = new MaxKey();
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Timestamp has help when returned from the server', async() => {
      const value = new Timestamp(0, 100);
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Symbol has help when returned from the server', async() => {
      const value = new Symbol('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Code has help when returned from the server', async() => {
      const value = new Code('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Decimal128 has help when returned from the server', async() => {
      const value = Decimal128.fromString('1');
      await shell.writeInputLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      await shell.writeInputLine('db.test.findOne().value.help()');
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Binary has help when returned from the server', async() => {
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
    it('ObjectId has help when created by user', async() => {
      const value = 'new ObjectId()';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('DBRef has help when created by user', async() => {
      const value = 'new DBRef("namespace", "oid")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MinKey has help when created by user', async() => {
      const value = 'new MinKey()';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('MaxKey has help when created by user', async() => {
      const value = 'new MaxKey()';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('NumberInt prints when created by user', async() => {
      const value = 'NumberInt(32.5).help';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('NumberLong prints when created by user', async() => {
      const value = 'NumberLong("1").help';
      await shell.writeInputLine(value);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Timestamp has help when created by user', async() => {
      const value = 'new Timestamp(0, 100)';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Symbol has help when created by user', async() => {
      const value = 'new Symbol("1")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Code has help when created by user', async() => {
      const value = 'new Code("1")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('Decimal128 has help when created by user', async() => {
      const value = 'NumberDecimal("1")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
    it('BinData has help when created by user', async() => {
      const value = 'new BinData(128, "MTIzNA==")';
      await shell.writeInputLine(`${value}.help`);
      await eventually(() => {
        shell.assertContainsOutput('BSON Class');
      });
      shell.assertNoErrors();
    });
  });
});

