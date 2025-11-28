import { expect } from 'chai';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';
import * as bson from 'bson';
import type { TestShell } from './test-shell';
import { startSharedTestServer } from '../../../testing/integration-testing-hooks';

describe('BSON e2e', function () {
  const testServer = startSharedTestServer();
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

  describe('printed BSON', function () {
    const outputDoc = {
      ObjectId: "ObjectId('5f16b8bebe434dc98cdfc9ca')",
      DBRef1: "DBRef('a', ObjectId('5f16b8bebe434dc98cdfc9cb'), 'db')",
      DBRef2: "DBRef('a', '5f16b8bebe434dc98cdfc9cb', 'db')",
      DBRef3: "DBRef('a', { x: '5f16b8bebe434dc98cdfc9cb' }, 'db')",
      MinKey: 'MinKey()',
      MaxKey: 'MaxKey()',
      NumberInt: 'Int32(32)',
      NumberLong: "Long('64')",
      Timestamp: 'Timestamp({ t: 100, i: 1 })',
      Symbol: "BSONSymbol('abc')",
      SymbolRawValue: "'abc'",
      Code: "Code('abc')",
      NumberDecimal: "Decimal128('1')",
      BinData: "Binary.createFromBase64('MTIzNA==', 128)",
      ISODate: "ISODate('2021-05-04T15:49:33.000Z')",
      RegExp: '/match/',
    };
    it('Entire doc prints when returned from the server', async function () {
      const buffer = Buffer.from('MTIzNA==', 'base64');
      const inputDoc = {
        ObjectId: new bson.ObjectId('5f16b8bebe434dc98cdfc9ca'),
        DBRef1: new bson.DBRef(
          'a',
          new bson.ObjectId('5f16b8bebe434dc98cdfc9cb'),
          'db'
        ),
        DBRef2: new bson.DBRef('a', '5f16b8bebe434dc98cdfc9cb' as any, 'db'),
        DBRef3: new bson.DBRef(
          'a',
          { x: '5f16b8bebe434dc98cdfc9cb' } as any,
          'db'
        ),
        MinKey: new bson.MinKey(),
        MaxKey: new bson.MaxKey(),
        Timestamp: new bson.Timestamp(new bson.Long(1, 100)),
        Symbol: new bson.BSONSymbol('abc'),
        Code: new bson.Code('abc'),
        NumberDecimal: new bson.Decimal128('1'),
        BinData: new bson.Binary(buffer, 128),
        ISODate: new Date('2021-05-04T15:49:33.000Z'),
        RegExp: /match/,
      };
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne(inputDoc);
      const output = await shell.executeLine('db.test.findOne()');
      expect(output).to.include(outputDoc.ObjectId);
      expect(output).to.include(outputDoc.DBRef1);
      expect(output).to.include(outputDoc.DBRef2);
      expect(output).to.include(outputDoc.DBRef3);
      expect(output).to.include(outputDoc.MinKey);
      expect(output).to.include(outputDoc.MaxKey);
      expect(output).to.include(outputDoc.Timestamp);
      expect(output).to.include(outputDoc.SymbolRawValue);
      expect(output).to.include(outputDoc.Code);
      expect(output).to.include(outputDoc.NumberDecimal);
      expect(output).to.include(outputDoc.BinData);
      expect(output).to.include(outputDoc.ISODate);
      expect(output).to.include(outputDoc.RegExp);
      const unpromotedOutput = await shell.executeLine(
        'db.test.findOne({}, {}, { promoteValues: false })'
      );
      expect(unpromotedOutput).to.include(outputDoc.Symbol);
      shell.assertNoErrors();
    });
    it('Entire doc prints when created by user', async function () {
      const value = `doc = {
        ObjectId: new ObjectId('5f16b8bebe434dc98cdfc9ca'),
        DBRef1: new DBRef('a', new ObjectId('5f16b8bebe434dc98cdfc9cb'), 'db'),
        DBRef2: new DBRef('a', '5f16b8bebe434dc98cdfc9cb', 'db'),
        DBRef3: new DBRef('a', { x: '5f16b8bebe434dc98cdfc9cb' }, 'db'),
        MinKey: new MinKey(),
        MaxKey: new MaxKey(),
        NumberInt: NumberInt("32"),
        NumberLong: NumberLong("64"),
        Timestamp: new Timestamp(100, 1),
        Symbol: new BSONSymbol('abc'),
        Code: new Code('abc'),
        NumberDecimal: NumberDecimal('1'),
        BinData: Binary.createFromBase64("MTIzNA==", 128),
        ISODate: ISODate("2021-05-04T15:49:33.000Z"),
        RegExp: /match/
      }\n`;
      const output = await shell.executeLine(value);
      expect(output).to.include(outputDoc.ObjectId);
      expect(output).to.include(outputDoc.DBRef1);
      expect(output).to.include(outputDoc.DBRef2);
      expect(output).to.include(outputDoc.DBRef3);
      expect(output).to.include(outputDoc.MinKey);
      expect(output).to.include(outputDoc.MaxKey);
      expect(output).to.include(outputDoc.Timestamp);
      expect(output).to.include(outputDoc.Symbol);
      expect(output).to.include(outputDoc.Code);
      expect(output).to.include(outputDoc.NumberDecimal);
      expect(output).to.include(outputDoc.BinData);
      expect(output).to.include(outputDoc.ISODate);
      expect(output).to.include(outputDoc.RegExp);
      shell.assertNoErrors();
    });
    it('Entire doc equals itself when being re-evaluated', async function () {
      const input = Object.entries(outputDoc)
        .map(([key, value]) => `${key}: ${value}`)
        .join(',');
      const firstOutput = await shell.executeLine(`a = ({${input}})`);
      const printedObject = firstOutput.match(/^\{[\s\S]+\}$/m)?.[0];
      await shell.executeLine(`b = ${printedObject}`);
      await shell.executeLine(`assert.deepStrictEqual(a, b)`);
      shell.assertNoErrors();
    });
    it('ObjectId prints when returned from the server', async function () {
      const value = new bson.ObjectId('5f16b8bebe434dc98cdfc9ca');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "ObjectId('5f16b8bebe434dc98cdfc9ca')"
      );
      shell.assertNoErrors();
    });
    it('DBRef prints when returned from the server', async function () {
      const value = new bson.DBRef(
        'coll',
        new bson.ObjectId('5f16b8bebe434dc98cdfc9ca')
      );
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "DBRef('coll', ObjectId('5f16b8bebe434dc98cdfc9ca'))"
      );
      shell.assertNoErrors();
    });
    it('MinKey prints when returned from the server', async function () {
      const value = new bson.MinKey();
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        'MinKey()'
      );
      shell.assertNoErrors();
    });
    it('MaxKey prints when returned from the server', async function () {
      const value = new bson.MaxKey();
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        'MaxKey()'
      );
      shell.assertNoErrors();
    });
    it('NumberLong prints when returned from the server', async function () {
      const value = new bson.Long('64');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "Long('64')"
      );
      shell.assertNoErrors();
    });
    it('NumberLong prints when returned from the server (> MAX_SAFE_INTEGER)', async function () {
      const value = new bson.Long('345678654321234561');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "Long('345678654321234561')"
      );
      shell.assertNoErrors();
    });
    it('Timestamp prints when returned from the server', async function () {
      const value = new bson.Timestamp(new bson.Long(0, 100));
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        'Timestamp({ t: 100, i: 0 })'
      );
      shell.assertNoErrors();
    });
    it('Code prints when returned from the server', async function () {
      const value = new bson.Code('abc');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "Code('abc')"
      );
      shell.assertNoErrors();
    });
    it('Decimal128 prints when returned from the server', async function () {
      const value = new bson.Decimal128('1');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "Decimal128('1')"
      );
      shell.assertNoErrors();
    });
    it('BinData prints when returned from the server', async function () {
      const buffer = Buffer.from('MTIzNA==', 'base64');
      const value = new bson.Binary(buffer, 128);
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "Binary.createFromBase64('MTIzNA==', 128)"
      );
      shell.assertNoErrors();
    });
    it('ISODate prints when returned from the server', async function () {
      const value = new Date('2021-05-04T15:49:33.000Z');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        "ISODate('2021-05-04T15:49:33.000Z')"
      );
      shell.assertNoErrors();
    });
    it('RegExp prints when returned from the server', async function () {
      const value = /match/;
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(await shell.executeLine('db.test.findOne().value')).to.include(
        '/match/'
      );
      shell.assertNoErrors();
    });
    it('BSONRegExp prints when returned from the server', async function () {
      const value = new bson.BSONRegExp('(?-i)A"A_', 'im');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine(
          'db.test.findOne({}, {}, { bsonRegExp: true }).value'
        )
      ).to.include(String.raw`BSONRegExp('(?-i)A"A_', 'im')`);
      shell.assertNoErrors();
    });
    it('ObjectId prints when created by user', async function () {
      const value = "ObjectId('5f16b8bebe434dc98cdfc9ca')";
      expect(await shell.executeLine(value)).to.include(value);
      shell.assertNoErrors();
    });
    it('DBRef prints when created by user', async function () {
      const value = "DBRef('coll', ObjectId('5f16b8bebe434dc98cdfc9ca'))";
      expect(await shell.executeLine(value)).to.include(value);
      shell.assertNoErrors();
    });
    it('MaxKey prints when created by user', async function () {
      const value = 'new MaxKey()';
      expect(await shell.executeLine(value)).to.include('MaxKey()');
      shell.assertNoErrors();
    });
    it('MinKey prints when created by user', async function () {
      const value = 'new MinKey()';
      expect(await shell.executeLine(value)).to.include('MinKey()');
      shell.assertNoErrors();
    });
    it('NumberInt prints when created by user', async function () {
      const value = 'NumberInt("32.5")';
      expect(await shell.executeLine(value)).to.include('Int32(32)');
      shell.assertNoErrors();
    });
    it('NumberLong prints when created by user', async function () {
      const value = 'NumberLong("64")';
      expect(await shell.executeLine(value)).to.include("Long('64')");
      shell.assertNoErrors();
    });
    it('NumberLong prints when created by user (> MAX_SAFE_INTEGER)', async function () {
      const value = 'NumberLong("345678654321234561")';
      expect(await shell.executeLine(value)).to.include(
        "Long('345678654321234561')"
      );
      shell.assertNoErrors();
    });
    it('Timestamp prints when created by user (legacy)', async function () {
      const value = 'Timestamp(100, 0)';
      expect(await shell.executeLine(value)).to.include(
        'Timestamp({ t: 100, i: 0 })'
      );
      shell.assertNoErrors();
    });
    it('Timestamp prints when created by user ({t, i})', async function () {
      const value = 'Timestamp({ t: 100, i: 0 })';
      expect(await shell.executeLine(value)).to.include(value);
      shell.assertNoErrors();
    });
    it('Symbol prints when created by user', async function () {
      const value = 'new BSONSymbol("symbol")';
      expect(await shell.executeLine(value)).to.include("BSONSymbol('symbol')");
      shell.assertNoErrors();
    });
    it('Code prints when created by user', async function () {
      const value = 'new Code("abc")';
      expect(await shell.executeLine(value)).to.include("Code('abc')");
      shell.assertNoErrors();
    });
    it('Code with scope prints when created by user', async function () {
      const value = 'new Code("abc", { s: 1 })';
      expect(await shell.executeLine(value)).to.include(
        "Code('abc', { s: 1 })"
      );
      shell.assertNoErrors();
    });
    it('Decimal128 prints when created by user', async function () {
      const value = 'NumberDecimal("100")';
      expect(await shell.executeLine(value)).to.include("Decimal128('100')");
      shell.assertNoErrors();
    });
    // NOTE this is a slight change from the old shell, since the old shell just
    // printed the raw input, while this one converts it to a string.
    it('BinData prints when created by user', async function () {
      const value = "BinData(128, 'MTIzNA==')";
      expect(await shell.executeLine(value)).to.include(
        "Binary.createFromBase64('MTIzNA==', 128)"
      );
      shell.assertNoErrors();
    });
    it('BinData prints as UUID when created by user as such', async function () {
      const value = "UUID('01234567-89ab-cdef-0123-456789abcdef')";
      expect(await shell.executeLine(value)).to.include(value);
      shell.assertNoErrors();
    });
    it('BinData prints as MD5 when created by user as such', async function () {
      const value = "MD5('0123456789abcdef0123456789abcdef')";
      expect(await shell.executeLine(value)).to.include(value);
      shell.assertNoErrors();
    });
    it('BinData prints as BinData when created as invalid UUID', async function () {
      const value = 'UUID("abcdef")';
      expect(await shell.executeLine(value)).to.include(
        "Binary.createFromBase64('q83v', 4)"
      );
      shell.assertNoErrors();
    });
    it('ISODate prints when created by user', async function () {
      const value = 'ISODate("2021-05-04T15:49:33.000Z")';
      expect(await shell.executeLine(value)).to.include(
        "ISODate('2021-05-04T15:49:33.000Z')"
      );
      shell.assertNoErrors();
    });
    it('RegExp prints when created by user', async function () {
      const value = '/match/';
      expect(await shell.executeLine(value)).to.include('/match/');
      shell.assertNoErrors();
    });
    it('BSONRegExp prints when created by user', async function () {
      const value = 'BSONRegExp(`(?-i)A"A_`, "im")';
      expect(await shell.executeLine(value)).to.include(
        String.raw`BSONRegExp('(?-i)A"A_', 'im')`
      );
      shell.assertNoErrors();
    });
  });
  describe('MaxKey/MinKey special handling', function () {
    it('inserts and retrieves MaxKey/MinKey regardless of whether they have been called as functions', async function () {
      await shell.executeLine(`use ${dbName}`);
      await shell.executeLine(`db.test.insertOne({
        maxfn: MaxKey, maxval: MaxKey(), minfn: MinKey, minval: MinKey()
      })`);
      const output = await shell.executeLine('db.test.findOne()');
      expect(output).to.include('maxfn: MaxKey()');
      expect(output).to.include('maxval: MaxKey()');
      expect(output).to.include('minfn: MinKey()');
      expect(output).to.include('minval: MinKey()');
    });
  });
  describe('help methods', function () {
    it('ObjectId has help when returned from the server', async function () {
      const value = new bson.ObjectId();
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help()')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('DBRef has help when returned from the server', async function () {
      const value = new bson.DBRef('coll', new bson.ObjectId());
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('MinKey has help when returned from the server', async function () {
      const value = new bson.MinKey();
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help()')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('MaxKey has help when returned from the server', async function () {
      const value = new bson.MaxKey();
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Timestamp has help when returned from the server', async function () {
      const value = new bson.Timestamp({ t: 0, i: 100 });
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help()')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Code has help when returned from the server', async function () {
      const value = new bson.Code('1');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Decimal128 has help when returned from the server', async function () {
      const value = new bson.Decimal128('1');
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help()')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Binary has help when returned from the server', async function () {
      const buffer = Buffer.from('MTIzNA==', 'base64');
      const value = new bson.Binary(buffer, 128);
      await shell.executeLine(`use ${dbName}`);
      await db.collection('test').insertOne({ value: value });
      expect(
        await shell.executeLine('db.test.findOne().value.help')
      ).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('ObjectId has help when created by user', async function () {
      const value = 'new ObjectId()';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('DBRef has help when created by user', async function () {
      const value = 'new DBRef("namespace", "oid")';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('MinKey has help when created by user', async function () {
      const value = 'new MinKey()';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('MaxKey has help when created by user', async function () {
      const value = 'new MaxKey()';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('NumberInt prints when created by user', async function () {
      const value = 'NumberInt("32.5").help';
      expect(await shell.executeLine(value)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('NumberLong prints when created by user', async function () {
      const value = 'NumberLong("1").help';
      expect(await shell.executeLine(value)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Timestamp has help when created by user', async function () {
      const value = 'new Timestamp(0, 100)';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Symbol has help when created by user', async function () {
      const value = 'new BSONSymbol("1")';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Code has help when created by user', async function () {
      const value = 'new Code("1")';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Decimal128 has help when created by user', async function () {
      const value = 'NumberDecimal("1")';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('BinData has help when created by user', async function () {
      const value = 'new BinData(128, "MTIzNA==")';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('ObjectId type has help when created by user', async function () {
      const value = 'ObjectId';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('DBRef type has help when created by user', async function () {
      const value = 'DBRef';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('MinKey type has help when created by user', async function () {
      const value = 'MinKey';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('MaxKey type has help when created by user', async function () {
      const value = 'MaxKey';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('NumberInt type prints when created by user', async function () {
      const value = 'NumberInt.help';
      expect(await shell.executeLine(value)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('NumberLong type prints when created by user', async function () {
      const value = 'NumberLong.help';
      expect(await shell.executeLine(value)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Timestamp type has help when created by user', async function () {
      const value = 'Timestamp.help';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Code type has help when created by user', async function () {
      const value = 'Code';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('Decimal128 type has help when created by user', async function () {
      const value = 'NumberDecimal';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
    it('BinData type has help when created by user', async function () {
      const value = 'BinData';
      expect(await shell.executeLine(`${value}.help`)).to.include('BSON Class');
      shell.assertNoErrors();
    });
  });
  describe('bsonsize', function () {
    it('works in the shell', async function () {
      const result = await shell.executeLine('({ size: bsonsize({ a: 1 }) })');
      expect(result).to.match(/size: \d+/);
    });
  });
  describe('inheritance', function () {
    it('instanceof works for bson types', async function () {
      expect(
        await shell.executeLine('ObjectId() instanceof ObjectId')
      ).to.include('true');
      shell.assertNoErrors();
    });
  });
  describe('inspect nesting depth', function () {
    const deepAndNestedDefinition = `({
        a: { b: { c: { d: { e: { f: { g: { h: "foundme" } } } } } } },
        array: [...Array(100000).keys()].map(i => ({ num: i })),
        str: 'All work and no playmakes Jack a dull boy'.repeat(4096) + 'The End'
      })`;
    const checkForDeepOutput = (output: string, wantFullOutput: boolean) => {
      if (wantFullOutput) {
        expect(output).not.to.include('[Object');
        expect(output).not.to.include('more items');
        expect(output).to.include('foundme');
        expect(output).to.include('num: 99999');
        expect(output).to.include('The End');
      } else {
        expect(output).to.include('[Object');
        expect(output).to.include('more items');
        expect(output).not.to.include('foundme');
        expect(output).not.to.include('num: 99999');
        expect(output).not.to.include('The End');
      }
    };

    beforeEach(async function () {
      await shell.executeLine(`use ${dbName}`);
      await shell.executeLine(`deepAndNested = ${deepAndNestedDefinition}`);
      await shell.executeLine(`db.coll.insertOne(deepAndNested)`);
    });

    it('inspects a full bson document when it is read from the server (interactive mode)', async function () {
      // Deeply nested object from the server should be fully printed
      const output = await shell.executeLine('db.coll.findOne()');
      checkForDeepOutput(output, true);
      // Same object doesn't need to be fully printed if created by the user
      const output2 = await shell.executeLine('deepAndNested');
      checkForDeepOutput(output2, false);
      shell.assertNoErrors();
    });

    it('can explicitly disable full-depth nesting (interactive mode)', async function () {
      shell.kill();
      shell = this.startTestShell({
        args: [await testServer.connectionString(), '--deepInspect=false'],
      });
      await shell.waitForPrompt();
      await shell.executeLine(`use ${dbName}`);
      const output = await shell.executeLine('db.coll.findOne()');
      checkForDeepOutput(output, false);
      shell.assertNoErrors();
    });

    it('does not deeply inspect objects in non-interactive mode for intermediate output', async function () {
      shell.kill();
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--eval',
          `use(${JSON.stringify(dbName)}); print(db.coll.findOne()); 0`,
        ],
      });
      await shell.waitForSuccessfulExit();
      checkForDeepOutput(shell.output, false);
      shell.assertNoErrors();
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--eval',
          `print(${deepAndNestedDefinition}); 0`,
        ],
      });
      await shell.waitForSuccessfulExit();
      checkForDeepOutput(shell.output, false);
      shell.assertNoErrors();
    });

    it('inspect full objects in non-interactive mode for final output', async function () {
      shell.kill();
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--eval',
          `use(${JSON.stringify(dbName)}); db.coll.findOne();`,
        ],
      });
      await shell.waitForSuccessfulExit();
      checkForDeepOutput(shell.output, true);
      shell.assertNoErrors();
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--eval',
          deepAndNestedDefinition,
        ],
      });
      await shell.waitForSuccessfulExit();
      checkForDeepOutput(shell.output, true);
      shell.assertNoErrors();
    });

    it('can explicitly disable full-depth nesting (non-interactive mode)', async function () {
      shell.kill();
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--deepInspect=false',
          '--eval',
          `use(${JSON.stringify(dbName)}); db.coll.findOne();`,
        ],
      });
      await shell.waitForSuccessfulExit();
      checkForDeepOutput(shell.output, false);
      shell.assertNoErrors();
      shell = this.startTestShell({
        args: [
          await testServer.connectionString(),
          '--deepInspect=false',
          '--eval',
          deepAndNestedDefinition,
        ],
      });
      await shell.waitForSuccessfulExit();
      checkForDeepOutput(shell.output, false);
      shell.assertNoErrors();
    });

    it('can parse serverStatus back to its original form', async function () {
      // Dates get special treatment but that doesn't currently apply
      // to mongosh's util.inspect that's available to users
      // (although maybe it should?).
      await shell.executeLine(
        `Date.prototype[Symbol.for('nodejs.util.inspect.custom')] = function(){ return 'ISODate("' + this.toISOString() + '")'; };`
      );
      // 'void 0' to avoid large output in the shell from serverStatus
      await shell.executeLine(
        'A = db.adminCommand({ serverStatus: 1 }); void 0'
      );
      await shell.executeLine('util.inspect(A)');
      await shell.executeLine(`B = eval('(' + util.inspect(A) + ')'); void 0`);
      shell.assertNoErrors();
      const output1 = await shell.executeLineWithJSONResult('A', {
        parseAsEJSON: false,
      });
      const output2 = await shell.executeLineWithJSONResult('B', {
        parseAsEJSON: false,
      });
      expect(output1).to.deep.equal(output2);
      shell.assertNoErrors();
    });
  });
});
