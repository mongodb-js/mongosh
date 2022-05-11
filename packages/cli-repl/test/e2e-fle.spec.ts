import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { TestShell } from './test-shell';
import { eventually } from '../../../testing/eventually';
import {
  startTestServer,
  skipIfServerVersion,
  skipIfCommunityServer,
  downloadCurrentCsfleSharedLibrary
} from '../../../testing/integration-testing-hooks';
import { makeFakeHTTPServer, fakeAWSHandlers } from '../../../testing/fake-kms';
import { once } from 'events';
import { serialize } from 'v8';
import { inspect } from 'util';
import path from 'path';

describe('FLE tests', () => {
  const testServer = startTestServer('not-shared', '--replicaset', '--nodes', '1');
  skipIfServerVersion(testServer, '< 4.2'); // FLE only available on 4.2+
  skipIfCommunityServer(testServer); // FLE is enterprise-only
  let kmsServer: ReturnType<typeof makeFakeHTTPServer>;
  let dbname: string;
  let csfleLibrary: string;

  before(async function() {
    if (process.platform === 'linux' && process.arch === 's390x') {
      return this.skip();
      // There is no CSFLE shared library binary for the rhel72 s390x that we test on.
      // We will address this in MONGOSH-862.
    }

    kmsServer = makeFakeHTTPServer(fakeAWSHandlers);
    kmsServer.listen(0);
    await once(kmsServer, 'listening');
    csfleLibrary = await downloadCurrentCsfleSharedLibrary();
  });
  after(() => {
    // eslint-disable-next-line chai-friendly/no-unused-expressions
    kmsServer?.close();
  });
  beforeEach(() => {
    kmsServer.requests = [];
    dbname = `test-${Date.now()}`;
  });
  afterEach(async() => {
    const client = await MongoClient.connect(await testServer.connectionString(), {});
    await client.db(dbname).dropDatabase();
    await client.close();
  });
  afterEach(TestShell.cleanup);

  for (const useApiStrict of [ false, true ]) {
    for (const withSessionToken of [ false, true ]) {
      // eslint-disable-next-line no-loop-func
      context(`with AWS KMS (apiStrict=${useApiStrict}, ${withSessionToken ? 'with' : 'without'} sessionToken)`, () => {
        if (useApiStrict) {
          skipIfServerVersion(testServer, '< 5.0');
        }

        const accessKeyId = 'SxHpYMUtB1CEVg9tX0N1';
        const secretAccessKey = '44mjXTk34uMUmORma3w1viIAx4RCUv78bzwDY0R7';
        const sessionToken = 'WXWHMnniSqij0CH27KK7H';
        async function makeTestShell(): Promise<TestShell> {
          return TestShell.start({
            args: [
              `--csfleLibraryPath=${csfleLibrary}`,
              `--awsAccessKeyId=${accessKeyId}`,
              `--awsSecretAccessKey=${secretAccessKey}`,
              `--keyVaultNamespace=${dbname}.keyVault`,
              ...(withSessionToken ? [`--awsSessionToken=${sessionToken}`] : []),
              ...(useApiStrict ? ['--apiStrict', '--apiVersion', '1'] : []),
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
        }

        it('passes through command line options', async() => {
          const shell = await makeTestShell();
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
          await eventually(async() => {
            await shell.executeLine('db.data.find();');
            shell.assertContainsError('MongoCryptError: decrypted key is incorrect length');
          });

          // The actual assertion here:
          if (!kmsServer.requests.some(req => req.headers.authorization.includes(accessKeyId)) ||
              (withSessionToken && !kmsServer.requests.some(req => req.headers['x-amz-security-token'] === sessionToken))) {
            throw new Error(`Missed expected request to AWS\nShell output:\n${shell.output}\nRequests:\n${kmsServer.requests.map(req => inspect(req.headers))}`);
          }
        });

        it('forwards command line options to the main Mongo instance', async() => {
          const shell = await makeTestShell();
          await shell.executeLine(`use ${dbname}`);
          await shell.executeLine('keyId = db.getMongo().getKeyVault().createKey("aws", {' +
            'region: "us-east-2", key: "arn:aws:kms:us-east-2:398471984214:key/174b7c1d-3651-4517-7521-21988befd8cb" });');
          await shell.executeLine('clientEncryption = db.getMongo().getClientEncryption();');
          await shell.executeLine('encrypted = clientEncryption.encrypt(' +
            'keyId, { someValue: "foo" }, "AEAD_AES_256_CBC_HMAC_SHA_512-Random");');
          const result = await shell.executeLine('({ decrypted: clientEncryption.decrypt(encrypted) })');
          expect(result).to.include("{ decrypted: { someValue: 'foo' } }");
          shell.assertNoErrors();
        });
      });
    }
  }

  it('works when the original shell was started with --nodb', async() => {
    const shell = TestShell.start({
      args: ['--nodb']
    });
    await shell.waitForPrompt();
    await shell.executeLine('local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }');
    await shell.executeLine(`keyMongo = Mongo(${JSON.stringify(await testServer.connectionString())}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      explicitEncryptionOnly: true \
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

  it('works when a schemaMap option has been passed', async() => {
    const shell = TestShell.start({
      args: ['--nodb', `--csfleLibraryPath=${csfleLibrary}`]
    });
    await shell.waitForPrompt();
    await shell.executeLine('local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }');
    await shell.executeLine(`keyMongo = Mongo(${JSON.stringify(await testServer.connectionString())}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      schemaMap: {} \
    });`);

    await shell.executeLine('keyVault = keyMongo.getKeyVault();');
    const keyId = await shell.executeLine('keyId = keyVault.createKey("local");');
    const uuidRegexp = /UUID([^)])/;
    expect(keyId).to.match(uuidRegexp);

    await shell.executeLine(`plainMongo = Mongo(${JSON.stringify(await testServer.connectionString())})`);
    await shell.executeLine(`db = plainMongo.getDB('${dbname}')`);
    const keyVaultContents = await shell.executeLine('db.keyVault.find()');
    expect(keyVaultContents).to.include(keyId.match(uuidRegexp)[1]);

    await shell.executeLine('clientEncryption = keyMongo.getClientEncryption();');
    await shell.executeLine('encrypted = clientEncryption.encrypt(' +
      'keyId, { someValue: "foo" }, "AEAD_AES_256_CBC_HMAC_SHA_512-Random");');
    const result = await shell.executeLine('({ decrypted: clientEncryption.decrypt(encrypted) })');
    expect(result).to.include("{ decrypted: { someValue: 'foo' } }");
  });

  it('skips encryption when a bypassQueryAnalysis option has been passed', async() => {
    const shell = TestShell.start({
      args: ['--nodb', `--csfleLibraryPath=${csfleLibrary}`]
    });
    const uri = JSON.stringify(await testServer.connectionString());

    await shell.waitForPrompt();

    await shell.executeLine('local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }');

    await shell.executeLine(`keyMongo = Mongo(${uri}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      bypassQueryAnalysis: true \
    });`);

    await shell.executeLine('keyVault = keyMongo.getKeyVault();');
    await shell.executeLine('keyId = keyVault.createKey("local");');

    await shell.executeLine(`schemaMap = { \
      '${dbname}.coll': { \
        bsonType: 'object', \
        properties: { \
          phoneNumber: { \
            encrypt: { \
              bsonType: 'string', \
              keyId: [keyId], \
              algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random' \
            } \
          } \
        } \
      } \
    };`);

    await shell.executeLine(`autoMongo = Mongo(${uri}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      schemaMap \
    });`);

    await shell.executeLine(`bypassMongo = Mongo(${uri}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      bypassQueryAnalysis: true \
    });`);

    await shell.executeLine(`plainMongo = Mongo(${uri});`);

    await shell.executeLine(`autoMongo.getDB('${dbname}').coll.insertOne({ \
      phoneNumber: '+12874627836445' \
    });`);
    await shell.executeLine(`bypassMongo.getDB('${dbname}').coll.insertOne({
      phoneNumber: '+98173247931847'
    });`);

    const autoMongoResult = await shell.executeLine(`autoMongo.getDB('${dbname}').coll.find()`);
    expect(autoMongoResult).to.include("phoneNumber: '+12874627836445'");
    expect(autoMongoResult).to.include("phoneNumber: '+98173247931847'");

    const bypassMongoResult = await shell.executeLine(`bypassMongo.getDB('${dbname}').coll.find()`);
    expect(bypassMongoResult).to.include("phoneNumber: '+12874627836445'");
    expect(bypassMongoResult).to.include("phoneNumber: '+98173247931847'");

    const plainMongoResult = await shell.executeLine(`plainMongo.getDB('${dbname}').coll.find()`);
    expect(plainMongoResult).to.include("phoneNumber: '+98173247931847'");
    expect(plainMongoResult).to.include('phoneNumber: Binary(Buffer.from');
    expect(plainMongoResult).to.not.include("phoneNumber: '+12874627836445'");
  });

  context('6.0+', () => {
    skipIfServerVersion(testServer, '< 6.0'); // FLE2 only available on 6.0+

    it('drops fle2 collection with all helper collections when encryptedFields options are in listCollections', async() => {
      const shell = TestShell.start({
        args: ['--nodb', `--csfleLibraryPath=${csfleLibrary}`],
        env: {
          ...process.env,
          MONGOSH_FLE2_SUPPORT: 'true'
        },
      });
      const uri = JSON.stringify(await testServer.connectionString());

      await shell.waitForPrompt();

      await shell.executeLine('local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }');

      await shell.executeLine(`keyMongo = Mongo(${uri}, { \
        keyVaultNamespace: '${dbname}.keyVault', \
        kmsProviders: { local } \
      });`);

      await shell.executeLine('keyVault = keyMongo.getKeyVault();');
      await shell.executeLine('keyId = keyVault.createKey("local");');

      await shell.executeLine(`encryptedFieldsMap = { \
        '${dbname}.collfle2': { \
          fields: [{ path: 'phoneNumber', keyId, bsonType: 'string' }] \
        } \
      };`);

      await shell.executeLine(`autoMongo = Mongo(${uri}, { \
        keyVaultNamespace: '${dbname}.keyVault', \
        kmsProviders: { local }, \
        encryptedFieldsMap \
      });`);

      // Drivers will create the auxilliary FLE2 collections only when explicitly creating collections
      // via the createCollection() command.
      await shell.executeLine(`autoMongo.getDB('${dbname}').createCollection('collfle2');`);
      await shell.executeLine(`autoMongo.getDB('${dbname}').collfle2.insertOne({ \
        phoneNumber: '+12874627836445' \
      });`);

      const autoMongoResult = await shell.executeLine(`autoMongo.getDB('${dbname}').collfle2.find()`);
      expect(autoMongoResult).to.include("phoneNumber: '+12874627836445'");

      await shell.executeLine(`plainMongo = Mongo(${uri});`);

      const plainMongoResult = await shell.executeLine(`plainMongo.getDB('${dbname}').collfle2.find()`);
      expect(plainMongoResult).to.include('phoneNumber: Binary(Buffer.from');
      expect(plainMongoResult).to.not.include("phoneNumber: '+12874627836445'");

      let collections = await shell.executeLine(`plainMongo.getDB('${dbname}').getCollectionNames()`);

      expect(collections).to.include('enxcol_.collfle2.ecc');
      expect(collections).to.include('enxcol_.collfle2.esc');
      expect(collections).to.include('enxcol_.collfle2.ecoc');
      expect(collections).to.include('collfle2');

      await shell.executeLine(`plainMongo.getDB('${dbname}').collfle2.drop();`);

      collections = await shell.executeLine(`plainMongo.getDB('${dbname}').getCollectionNames()`);

      expect(collections).to.not.include('enxcol_.collfle2.ecc');
      expect(collections).to.not.include('enxcol_.collfle2.esc');
      expect(collections).to.not.include('enxcol_.collfle2.ecoc');
      expect(collections).to.not.include('collfle2');
    });
  });

  it('performs KeyVault data key management as expected', async() => {
    const shell = TestShell.start({
      args: [await testServer.connectionString(), `--csfleLibraryPath=${csfleLibrary}`]
    });
    await shell.waitForPrompt();
    // Wrapper for executeLine that expects single-line output
    const runSingleLine = async(line) => (await shell.executeLine(line)).split('\n')[0].trim();
    await runSingleLine('local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }');
    await runSingleLine(`keyMongo = Mongo(db.getMongo()._uri, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      explicitEncryptionOnly: true \
    });`);
    await runSingleLine(`use('${dbname}')`);
    await runSingleLine('keyVault = keyMongo.getKeyVault();');
    await runSingleLine('keyId = keyVault.createKey("local", "", ["testaltname"]);');
    expect(await runSingleLine('db.keyVault.countDocuments({ _id: keyId, keyAltNames: "testaltname" })'))
      .to.equal('1');
    expect(await runSingleLine('keyVault.getKey(keyId).next()._id.toString() == keyId.toString()'))
      .to.equal('true');
    expect(await runSingleLine('keyVault.getKeys().next()._id.toString() == keyId.toString()'))
      .to.equal('true');
    expect(await runSingleLine('keyVault.addKeyAlternateName(keyId, "otheraltname").keyAltNames.join(",")'))
      .to.equal('testaltname');
    expect(await runSingleLine('keyVault.getKeyByAltName("otheraltname").next().keyAltNames.join(",")'))
      .to.equal('testaltname,otheraltname');
    expect(await runSingleLine('keyVault.removeKeyAlternateName(keyId, "testaltname").keyAltNames.join(",")'))
      .to.equal('testaltname,otheraltname');
    expect(await runSingleLine('keyVault.getKeyByAltName("otheraltname").next().keyAltNames.join(",")'))
      .to.equal('otheraltname');
    expect(await runSingleLine('keyVault.deleteKey(keyId).deletedCount'))
      .to.equal('1');
    expect(await runSingleLine('db.keyVault.countDocuments()'))
      .to.equal('0');
  });
});
