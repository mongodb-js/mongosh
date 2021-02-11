import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { TestShell } from './test-shell';
import { startTestServer, useBinaryPath, skipIfServerVersion } from '../../../testing/integration-testing-hooks';
import { makeFakeHTTPServer, fakeAWSHandlers } from '../../../testing/fake-kms';
import { once } from 'events';
import { serialize } from 'v8';
import { inspect } from 'util';
import path from 'path';

describe('FLE tests', () => {
  const testServer = startTestServer('shared');
  skipIfServerVersion(testServer, '< 4.2'); // FLE only available on 4.2+
  useBinaryPath(testServer); // Get mongocryptd in the PATH for this test
  let kmsServer: ReturnType<typeof makeFakeHTTPServer>;
  let dbname: string;

  before(async() => {
    kmsServer = makeFakeHTTPServer(fakeAWSHandlers);
    kmsServer.listen(0);
    await once(kmsServer, 'listening');
  });
  after(() => {
    kmsServer.close();
  });
  beforeEach(() => {
    kmsServer.requests = [];
    dbname = `test-${Date.now()}`;
  });
  afterEach(async() => {
    const client = await MongoClient.connect(await testServer.connectionString(), {});
    await client.db(dbname).dropDatabase();
    await client.close();
    await TestShell.killall();
  });

  it('passes through command line options', async() => {
    const accessKeyId = 'SxHpYMUtB1CEVg9tX0N1';
    const secretAccessKey = '44mjXTk34uMUmORma3w1viIAx4RCUv78bzwDY0R7';
    const shell = TestShell.start({
      args: [
        `--awsAccessKeyId=${accessKeyId}`,
        `--awsSecretAccessKey=${secretAccessKey}`,
        `--keyVaultNamespace=${dbname}.keyVault`,
        await testServer.connectionString()
      ],
      env: {
        ...process.env,
        NODE_OPTIONS: '--require ./redirect-network-io.js',
        REDIRECT_NETWORK_SOURCES: serialize(fakeAWSHandlers.map(({ host }) => host)).toString('base64'),
        REDIRECT_NETWORK_TARGET: `localhost:${(kmsServer.address() as any).port}`,
      },
      cwd: path.join(__dirname, 'fixtures')
    });

    await shell.executeLine(`use ${dbname}`);
    await shell.executeLine(`db.keyVault.insertOne({
      _id: UUID("e7b4abe7-ff70-48c3-9d3a-3526e18c2646"),
      keyMaterial: new Binary(Buffer.from("010202007888b7b9089f9cf816059c4c02edf139d50227528b2a74a5c9910c89095d45a9d10133bd4c047f2ba610d7ad4efcc945f863000000c23081bf06092a864886f70d010706a081b13081ae0201003081a806092a864886f70d010701301e060960864801650304012e3011040cf406b9ccb00f83dd632e76e9020110807b9c2b3a676746e10486ec64468d45ec89cac30f59812b711fc24530188166c481f4f4ab376c258f8f54affdc8523468fdd07b84e77b21a14008a23fb6d111c05eb4287b7b973f3a60d5c7d87074119b424477366cbe72c31da8fc76b8f72e31f609c3b423c599d3e4a59c21e4a0fe227ebe1aa53038cb94f79c457b", "hex"), 0),
      creationDate: ISODate('2021-02-10T15:51:00.567Z'),
      updateDate: ISODate('2021-02-10T15:51:00.567Z'),
      status: 0,
      masterKey: {
        provider: 'aws',
        region: 'us-east-2',
        key: 'arn:aws:kms:us-east-2:398471984214:key/174b7c1d-3651-4517-7521-21988befd8cb'
      }
    })`);
    await shell.executeLine(`db.data.insertOne({
      _id: ObjectId("602400ec9933cbed7fa92a1c"),
      taxid: new Binary(Buffer.from("02e7b4abe7ff7048c39d3a3526e18c264602846f122fa8c1ae1b8aff3dc7c20a8a3dbc95541e8d0d75cb8daf0b7e3137d553a788ccb62e31fed2da98ea3a596972c6dc7c17bbe6f9a9edc3a7f3e2ad96a819", "hex"), 6)
    });`);
    // This will try to automatically decrypt the data, but it will not succeed.
    // That does not matter here -- we're just checking that the HTTP requests
    // made were successful.
    await shell.executeLine('db.data.find();');

    // The actual assertion here:
    if (!kmsServer.requests.some(req => req.headers.authorization.includes(accessKeyId))) {
      throw new Error(`Missed expected request to AWS\nShell output:\n${shell.output}\nRequests:\n${kmsServer.requests.map(req => inspect(req.headers))}`);
    }
  });

  it('works when the original shell was started with --nodb', async() => {
    const shell = TestShell.start({
      args: ['--nodb']
    });
    await shell.executeLine('local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }');
    await shell.executeLine(`keyMongo = Mongo(${JSON.stringify(await testServer.connectionString())}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProvider: { local } \
    });`);
    await shell.executeLine('keyVault = keyMongo.getKeyVault();');
    const keyId = await shell.executeLine('keyId = keyVault.createKey("local");');
    const uuidRegexp = /UUID([^)])/;
    expect(keyId).to.match(uuidRegexp);
    await shell.executeLine(`plainMongo = Mongo(${JSON.stringify(await testServer.connectionString())})`);
    await shell.executeLine(`db = plainMongo.getDB('${dbname}')`);
    const keyVaultContents = await shell.executeLine('db.keyVault.find()');
    expect(keyVaultContents).to.include(keyId.match(uuidRegexp)[1]);
  });
});
