import { type ServiceProvider } from '@mongosh/service-provider-core';
import * as bson from 'bson';
import * as chai from 'chai';
import { expect } from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import type { StubbedInstance } from 'ts-sinon';
import { stubInterface } from 'ts-sinon';
import { deepInspectServiceProviderWrapper } from './deep-inspect-service-provider-wrapper';
import * as util from 'util';
import { makePrintableBson } from '@mongosh/shell-bson';

chai.use(sinonChai);

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

function truncatedString(text: string): boolean {
  return /\d+ more character/.test(text);
}

function truncatedArray(text: string): boolean {
  return /\d+ more item/.test(text);
}
function truncatedObject(text: string): boolean {
  return /\[Object\]/.test(text);
}

function wasTruncated(text: string): boolean {
  return truncatedString(text) || truncatedArray(text) || truncatedObject(text);
}

describe('deepInspectServiceProviderWrapper', function () {
  let serviceProvider: StubbedInstance<ServiceProvider>;
  let sp: ServiceProvider;

  // make the tests behave the same regardless of whether this file was focused
  // or not
  makePrintableBson(bson);

  const doc = {
    array: Array.from(Array(1000), (_, i) => i),
    string: 'All work and no play makes Jack a dull boy. '.repeat(250),
    object: {
      foo: {
        bar: {
          baz: {
            qux: {
              quux: {
                corge: {
                  grault: 'If you can read this, you are too close.',
                },
              },
            },
          },
        },
      },
    },
  };

  function checkResultDoc(result: any) {
    expect(result).to.deep.equal(doc);
    expect((result as any)[customInspectSymbol]).to.be.a('function');
    expect((result as any).array[customInspectSymbol]).to.be.a('function');
    expect((result as any).object[customInspectSymbol]).to.be.a('function');
    expect((result as any).object.foo[customInspectSymbol]).to.be.a('function');
    expect(wasTruncated(util.inspect(result))).to.equal(false);
    expect(wasTruncated(util.inspect(result?.array))).to.equal(false);
    expect(wasTruncated(util.inspect(result?.object))).to.equal(false);
    expect(wasTruncated(util.inspect(result?.object.foo))).to.equal(false);
  }

  const everyType = {
    double: new bson.Double(1.2),
    doubleThatIsAlsoAnInteger: new bson.Double(1),
    string: 'Hello, world!',
    binData: new bson.Binary(Buffer.from([1, 2, 3])),
    boolean: true,
    date: new Date('2023-04-05T13:25:08.445Z'),
    null: null,
    regex: new bson.BSONRegExp('pattern', 'i'),
    javascript: new bson.Code('function() {}'),
    symbol: new bson.BSONSymbol('symbol'),
    javascriptWithScope: new bson.Code('function() {}', { foo: 1, bar: 'a' }),
    int: new bson.Int32(12345),
    timestamp: new bson.Timestamp(bson.Long.fromString('7218556297505931265')),
    long: bson.Long.fromString('123456789123456789'),
    decimal: new bson.Decimal128(
      Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    ),
    minKey: new bson.MinKey(),
    maxKey: new bson.MaxKey(),

    binaries: {
      generic: new bson.Binary(Buffer.from([1, 2, 3]), 0),
      functionData: new bson.Binary(Buffer.from('//8='), 1),
      binaryOld: new bson.Binary(Buffer.from('//8='), 2),
      uuidOld: new bson.Binary(Buffer.from('c//SZESzTGmQ6OfR38A11A=='), 3),
      uuid: new bson.UUID('AAAAAAAA-AAAA-4AAA-AAAA-AAAAAAAAAAAA'),
      md5: new bson.Binary(Buffer.from('c//SZESzTGmQ6OfR38A11A=='), 5),
      encrypted: new bson.Binary(Buffer.from('c//SZESzTGmQ6OfR38A11A=='), 6),
      compressedTimeSeries: new bson.Binary(
        Buffer.from(
          'CQCKW/8XjAEAAIfx//////////H/////////AQAAAAAAAABfAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAHAAAAAAAAAA4AAAAAAAAAAA==',
          'base64'
        )
      ),
      custom: new bson.Binary(Buffer.from('//8='), 128),
    },

    dbRef: new bson.DBRef(
      'namespace',
      new bson.ObjectId('642d76b4b7ebfab15d3c4a78')
    ),
  };

  function checkResultEveryType(result: any) {
    expect(result).to.deep.equal(everyType);
    expect(wasTruncated(util.inspect(result))).to.equal(false);

    // this makes sure that we didn't accidentally mess with the custom inspect
    // methods of the BSON types, dates, regexes or simple values
    expect(util.inspect(result)).to.equal(`{
  double: Double(1.2),
  doubleThatIsAlsoAnInteger: Double(1),
  string: 'Hello, world!',
  binData: Binary.createFromBase64('AQID', 0),
  boolean: true,
  date: 2023-04-05T13:25:08.445Z,
  null: null,
  regex: BSONRegExp('pattern', 'i'),
  javascript: Code('function() {}'),
  symbol: BSONSymbol('symbol'),
  javascriptWithScope: Code('function() {}', { foo: 1, bar: 'a' }),
  int: Int32(12345),
  timestamp: Timestamp({ t: 1680701109, i: 1 }),
  long: Long('123456789123456789'),
  decimal: Decimal128('5.477284286264328586719275128128001E-4088'),
  minKey: MinKey(),
  maxKey: MaxKey(),
  binaries: {
    generic: Binary.createFromBase64('AQID', 0),
    functionData: Binary.createFromBase64('Ly84PQ==', 1),
    binaryOld: Binary.createFromBase64('Ly84PQ==', 2),
    uuidOld: Binary.createFromBase64('Yy8vU1pFU3pUR21RNk9mUjM4QTExQT09', 3),
    uuid: UUID('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),
    md5: MD5('632f2f535a45537a54476d51364f66523338413131413d3d'),
    encrypted: Binary.createFromBase64('Yy8vU1pFU3pUR21RNk9mUjM4QTExQT09', 6),
    compressedTimeSeries: Binary.createFromBase64('CQCKW/8XjAEAAIfx//////////H/////////AQAAAAAAAABfAAAAAAAAAAEAAAAAAAAAAgAAAAAAAAAHAAAAAAAAAA4AAAAAAAAAAA==', 0),
    custom: Binary.createFromBase64('Ly84PQ==', 128)
  },
  dbRef: DBRef('namespace', ObjectId('642d76b4b7ebfab15d3c4a78'))
}`);
  }

  beforeEach(function () {
    serviceProvider = stubInterface<ServiceProvider>();
    serviceProvider.initialDb = 'db1';
    serviceProvider.bsonLibrary = bson;
    sp = deepInspectServiceProviderWrapper(serviceProvider);
  });

  it('would have truncated the test documents without deep inspection', function () {
    // make sure that our assertions would have caught truncation if it were to happen
    const text = util.inspect(doc);
    expect(truncatedString(text)).to.equal(true);
    expect(truncatedArray(text)).to.equal(true);
    expect(truncatedObject(text)).to.equal(true);
    expect(wasTruncated(text)).to.equal(true);
  });

  it('wraps forwarded methods', async function () {
    serviceProvider.count.resolves(5);
    const result = await sp.count('testDb', 'testColl', {});
    expect(result).to.equal(5);
  });

  it('wraps bson methods', async function () {
    serviceProvider.runCommand.resolves(doc);
    const result = await sp.runCommand('testDb', {}, {}, {});
    checkResultDoc(result);
  });

  it('wraps find cursors', async function () {
    const stubs = {
      // forwarded method
      allowDiskUse: sinon.stub(),

      // forwarded method that returns this for chaining
      withReadPreference: sinon.stub().returnsThis(),

      // methods that return results, promises of results, etc.
      next: sinon.stub().resolves(doc),
      tryNext: sinon.stub().resolves(doc),
      toArray: sinon.stub().resolves([doc, everyType]),
      readBufferedDocuments: sinon.stub().returns([doc, everyType]),
    };
    serviceProvider.find.returns(stubs as any);

    const cursor = sp.find('testDb', 'testColl', {}, {}, {});

    cursor.withReadPreference('primary').allowDiskUse();
    expect(stubs.withReadPreference).to.have.been.calledOnce;
    expect(stubs.allowDiskUse).to.have.been.calledOnce;

    const nextResult = await cursor.next();
    checkResultDoc(nextResult);

    const tryNextResult = await cursor.tryNext();
    checkResultDoc(tryNextResult);

    const toArrayResult = await cursor.toArray();
    expect(toArrayResult).to.deep.equal([doc, everyType]);
    checkResultDoc(toArrayResult[0]);
    checkResultEveryType(toArrayResult[1]);

    const readBufferedDocumentsResult = cursor.readBufferedDocuments();
    expect(readBufferedDocumentsResult).to.deep.equal([doc, everyType]);
    checkResultDoc(readBufferedDocumentsResult[0]);
    checkResultEveryType(readBufferedDocumentsResult[1]);
  });

  it('wraps aggregation cursors', async function () {
    const stubs = {
      // forwarded method
      project: sinon.stub(),

      // forwarded method that returns this for chaining
      withReadPreference: sinon.stub().returnsThis(),

      // methods that return results, promises of results, etc.
      next: sinon.stub().resolves(doc),
      tryNext: sinon.stub().resolves(doc),
      toArray: sinon.stub().resolves([doc, everyType]),
      readBufferedDocuments: sinon.stub().returns([doc, everyType]),
    };
    serviceProvider.aggregate.returns(stubs as any);

    const cursor = sp.aggregate('testDb', 'testColl', [], {}, {});

    cursor.withReadPreference('primary').project({});
    expect(stubs.withReadPreference).to.have.been.calledOnce;
    expect(stubs.project).to.have.been.calledOnce;

    const nextResult = await cursor.next();
    checkResultDoc(nextResult);

    const tryNextResult = await cursor.tryNext();
    checkResultDoc(tryNextResult);

    const toArrayResult = await cursor.toArray();
    checkResultDoc(toArrayResult[0]);
    checkResultEveryType(toArrayResult[1]);

    const readBufferedDocumentsResult = cursor.readBufferedDocuments();
    checkResultDoc(readBufferedDocumentsResult[0]);
    checkResultEveryType(readBufferedDocumentsResult[1]);
  });

  it('wraps run command cursors', async function () {
    const stubs = {
      // forwarded method
      batchSize: sinon.stub(),

      // methods that return results, promises of results, etc.
      next: sinon.stub().resolves(doc),
      tryNext: sinon.stub().resolves(doc),
      toArray: sinon.stub().resolves([doc, everyType]),
      readBufferedDocuments: sinon.stub().returns([doc, everyType]),
    };
    serviceProvider.runCursorCommand.returns(stubs as any);

    const cursor = sp.runCursorCommand('testDb', {}, {}, {});

    cursor.batchSize(10);
    expect(stubs.batchSize).to.have.been.calledOnce;

    const nextResult = await cursor.next();
    checkResultDoc(nextResult);

    const tryNextResult = await cursor.tryNext();
    checkResultDoc(tryNextResult);

    const toArrayResult = await cursor.toArray();
    expect(toArrayResult).to.deep.equal([doc, everyType]);
    checkResultDoc(toArrayResult[0]);
    checkResultEveryType(toArrayResult[1]);

    const readBufferedDocumentsResult = cursor.readBufferedDocuments();
    expect(readBufferedDocumentsResult).to.deep.equal([doc, everyType]);
    checkResultDoc(readBufferedDocumentsResult[0]);
    checkResultEveryType(readBufferedDocumentsResult[1]);
  });

  it('wraps change streams', async function () {
    const stubs = {
      // forwarded method
      hasNext: sinon.stub().resolves(true),

      // methods that return results, promises of results, etc.
      next: sinon.stub().resolves(doc),
      tryNext: sinon.stub().resolves(doc),
      toArray: sinon.stub().resolves([doc, everyType]),
      readBufferedDocuments: sinon.stub().returns([doc, everyType]),
    };
    serviceProvider.watch.returns(stubs as any);

    const cursor = sp.watch([], {}, {});

    await cursor.hasNext();
    expect(stubs.hasNext).to.have.been.calledOnce;

    const nextResult = await cursor.next();
    checkResultDoc(nextResult);

    const tryNextResult = await cursor.tryNext();
    checkResultDoc(tryNextResult);
  });
});
