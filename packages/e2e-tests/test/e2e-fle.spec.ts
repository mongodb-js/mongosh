import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import type { TestShell } from './test-shell';
import {
  eventually,
  startTestServer,
  skipIfApiStrict,
  skipIfServerVersion,
  skipIfCommunityServer,
  downloadCurrentCryptSharedLibrary,
  sortObjectArray,
  makeFakeHTTPServer,
  fakeAWSHandlers,
} from '@mongosh/testing';
import { once } from 'events';
import { serialize } from 'v8';
import { inspect } from 'util';
import path from 'path';

describe('FLE tests', function () {
  const testServer = startTestServer('e2e-fle', {
    topology: 'replset',
    secondaries: 0,
  });
  skipIfServerVersion(testServer, '< 4.2'); // FLE only available on 4.2+
  skipIfCommunityServer(testServer); // FLE is enterprise-only
  let kmsServer: ReturnType<typeof makeFakeHTTPServer>;
  let dbname: string;
  let cryptLibrary: string;
  let cryptLibrary82: string;

  before(async function () {
    if (process.platform === 'linux') {
      const [major, minor] = (process.report as any)
        .getReport()
        .header.glibcVersionRuntime.split('.');
      expect(major).to.equal('2');
      // All crypt_shared versions that we use require at least glibc 2.28
      if (+minor < 28) return this.skip();
    }

    kmsServer = makeFakeHTTPServer(fakeAWSHandlers);
    kmsServer.listen(0);
    await once(kmsServer, 'listening');
    // TODO(MONGOSH-2192): Go back to always testing with latest continuous version.
    [cryptLibrary, cryptLibrary82] = await Promise.all([
      downloadCurrentCryptSharedLibrary(),
      downloadCurrentCryptSharedLibrary('8.2.0'),
    ]);
  });
  after(function () {
    kmsServer?.close();
  });
  beforeEach(function () {
    kmsServer.requests = [];
    dbname = `test-${Date.now()}`;
  });
  afterEach(async function () {
    const client = await MongoClient.connect(
      await testServer.connectionString(),
      {}
    );
    await client.db(dbname).dropDatabase();
    await client.close();
  });

  function* awsTestCases() {
    for (const useApiStrict of [false, true]) {
      for (const withSessionToken of [false, true]) {
        for (const withEnvVarCredentials of [false, true]) {
          yield {
            useApiStrict,
            withSessionToken,
            withEnvVarCredentials,
            testDescription:
              `with AWS KMS (apiStrict=${useApiStrict}, ` +
              `${withSessionToken ? 'with' : 'without'} sessionToken, ` +
              `${
                withEnvVarCredentials ? 'with' : 'without'
              } credentials in env vars)`,
          };
        }
      }
    }
  }

  for (const {
    useApiStrict,
    withSessionToken,
    withEnvVarCredentials,
    testDescription,
  } of awsTestCases()) {
    context(testDescription, function () {
      if (useApiStrict) {
        skipIfServerVersion(testServer, '< 5.0');
      }

      const accessKeyId = 'SxHpYMUtB1CEVg9tX0N1';
      const secretAccessKey = '44mjXTk34uMUmORma3w1viIAx4RCUv78bzwDY0R7';
      const sessionToken = 'WXWHMnniSqij0CH27KK7H';
      async function makeTestShell(ctx: Mocha.Context): Promise<TestShell> {
        const shell = ctx.startTestShell({
          args: [
            `--cryptSharedLibPath=${cryptLibrary}`,
            ...(withEnvVarCredentials
              ? []
              : [
                  `--keyVaultNamespace=${dbname}.keyVault`,
                  `--awsAccessKeyId=${accessKeyId}`,
                  `--awsSecretAccessKey=${secretAccessKey}`,
                  ...(withSessionToken
                    ? [`--awsSessionToken=${sessionToken}`]
                    : []),
                ]),
            ...(useApiStrict ? ['--apiStrict', '--apiVersion', '1'] : []),
            await testServer.connectionString(),
          ],
          env: {
            ...process.env,
            NODE_OPTIONS: '--require ./redirect-network-io.js',
            REDIRECT_NETWORK_SOURCES: serialize(
              fakeAWSHandlers.map(({ host }) => host)
            ).toString('base64'),
            REDIRECT_NETWORK_TARGET: `localhost:${
              (kmsServer.address() as any).port
            }`,
            ...(withEnvVarCredentials
              ? {
                  AWS_ACCESS_KEY_ID: accessKeyId,
                  AWS_SECRET_ACCESS_KEY: secretAccessKey,
                  AWS_SESSION_TOKEN: withSessionToken
                    ? sessionToken
                    : undefined,
                }
              : {}),
          },
          cwd: path.join(__dirname, '..', '..', 'cli-repl', 'test', 'fixtures'),
        });
        await shell.waitForPrompt();

        if (withEnvVarCredentials) {
          // Need to set up the AWS context inside the shell for enabling
          // automatic encryption since there are no credentials on the command line
          // which would indicate that automatic encryption should be enabled
          await shell.executeLine(`db = new Mongo(db.getMongo(), {
            keyVaultNamespace: ${JSON.stringify(dbname + '.keyVault')},
            kmsProviders: { aws: {} }
          }).getDB(${JSON.stringify(dbname)})`);
        } else {
          await shell.executeLine(`use ${dbname}`);
        }

        return shell;
      }

      it('passes through command line options', async function () {
        const shell = await makeTestShell(this);
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
        await eventually(async () => {
          await shell.executeLine('db.data.find();');
          shell.assertContainsError(
            'MongoCryptError: decrypted key is incorrect length'
          );
        });

        // The actual assertion here:
        if (
          !kmsServer.requests.some((req) =>
            req.headers.authorization?.includes(accessKeyId)
          ) ||
          (withSessionToken &&
            !kmsServer.requests.some(
              (req) => req.headers['x-amz-security-token'] === sessionToken
            ))
        ) {
          throw new Error(
            `Missed expected request to AWS\nShell output:\n${
              shell.output
            }\nRequests:\n${kmsServer.requests.map((req) =>
              inspect(req.headers)
            )}`
          );
        }
      });

      it('forwards command line options to the main Mongo instance', async function () {
        const shell = await makeTestShell(this);
        await shell.executeLine(
          'keyId = db.getMongo().getKeyVault().createKey("aws", {' +
            'region: "us-east-2", key: "arn:aws:kms:us-east-2:398471984214:key/174b7c1d-3651-4517-7521-21988befd8cb" });'
        );
        await shell.executeLine(
          'clientEncryption = db.getMongo().getClientEncryption();'
        );
        await shell.executeLine(
          'encrypted = clientEncryption.encrypt(' +
            'keyId, { someValue: "foo" }, "AEAD_AES_256_CBC_HMAC_SHA_512-Random");'
        );
        const result = await shell.executeLine(
          '({ decrypted: clientEncryption.decrypt(encrypted) })'
        );
        expect(result).to.include("{ decrypted: { someValue: 'foo' } }");
        shell.assertNoErrors();
      });
    });
  }

  it('works when the original shell was started with --nodb', async function () {
    const shell = this.startTestShell({
      args: ['--nodb'],
    });
    await shell.waitForPrompt();
    await shell.executeLine(
      'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
    );
    await shell.executeLine(`keyMongo = Mongo(${JSON.stringify(
      await testServer.connectionString()
    )}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      explicitEncryptionOnly: true \
    });`);
    await shell.executeLine('keyVault = keyMongo.getKeyVault();');
    const keyId = await shell.executeLine(
      'keyId = keyVault.createKey("local");'
    );
    const uuidRegexp = /UUID([^)])/;
    expect(keyId).to.match(uuidRegexp);
    await shell.executeLine(
      `plainMongo = Mongo(${JSON.stringify(
        await testServer.connectionString()
      )})`
    );
    await shell.executeLine(`db = plainMongo.getDB('${dbname}')`);
    const keyVaultContents = await shell.executeLine('db.keyVault.find()');
    expect(keyVaultContents).to.include(uuidRegexp.exec(keyId)?.[1]);
  });

  it('works when a schemaMap option has been passed', async function () {
    const shell = this.startTestShell({
      args: ['--nodb', `--cryptSharedLibPath=${cryptLibrary}`],
    });
    await shell.waitForPrompt();
    await shell.executeLine(
      'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
    );
    await shell.executeLine(`keyMongo = Mongo(${JSON.stringify(
      await testServer.connectionString()
    )}, { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      schemaMap: {}, \
      encryptedFieldsMap: {} \
    });`);

    await shell.executeLine('keyVault = keyMongo.getKeyVault();');
    const keyId = await shell.executeLine(
      'keyId = keyVault.createKey("local");'
    );
    const uuidRegexp = /UUID([^)])/;
    expect(keyId).to.match(uuidRegexp);

    await shell.executeLine(
      `plainMongo = Mongo(${JSON.stringify(
        await testServer.connectionString()
      )})`
    );
    await shell.executeLine(`db = plainMongo.getDB('${dbname}')`);
    const keyVaultContents = await shell.executeLine('db.keyVault.find()');
    expect(keyVaultContents).to.include(uuidRegexp.exec(keyId)?.[1]);

    await shell.executeLine(
      'clientEncryption = keyMongo.getClientEncryption();'
    );
    await shell.executeLine(
      'encrypted = clientEncryption.encrypt(' +
        'keyId, { someValue: "foo" }, "AEAD_AES_256_CBC_HMAC_SHA_512-Random");'
    );
    const result = await shell.executeLine(
      '({ decrypted: clientEncryption.decrypt(encrypted) })'
    );
    expect(result).to.include("{ decrypted: { someValue: 'foo' } }");
  });

  it('skips automatic encryption when a bypassQueryAnalysis option has been passed', async function () {
    const shell = this.startTestShell({
      args: ['--nodb', `--cryptSharedLibPath=${cryptLibrary}`],
    });
    const uri = JSON.stringify(await testServer.connectionString());

    await shell.waitForPrompt();

    await shell.executeLine(
      'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
    );

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

    const autoMongoResult = await shell.executeLine(
      `autoMongo.getDB('${dbname}').coll.find()`
    );
    expect(autoMongoResult).to.include("phoneNumber: '+12874627836445'");
    expect(autoMongoResult).to.include("phoneNumber: '+98173247931847'");

    const bypassMongoResult = await shell.executeLine(
      `bypassMongo.getDB('${dbname}').coll.find()`
    );
    expect(bypassMongoResult).to.include("phoneNumber: '+12874627836445'");
    expect(bypassMongoResult).to.include("phoneNumber: '+98173247931847'");

    const plainMongoResult = await shell.executeLine(
      `plainMongo.getDB('${dbname}').coll.find()`
    );
    expect(plainMongoResult).to.include("phoneNumber: '+98173247931847'");
    expect(plainMongoResult).to.include(
      'phoneNumber: Binary.createFromBase64('
    );
    expect(plainMongoResult).to.not.include("phoneNumber: '+12874627836445'");
  });

  it('does not allow compactStructuredEncryptionData command when mongo instance configured without auto encryption', async function () {
    const shell = this.startTestShell({
      args: [await testServer.connectionString()],
    });
    await shell.waitForPrompt();

    const compactResult = await shell.executeLine(
      'db.test.compactStructuredEncryptionData()'
    );
    expect(compactResult).to.include(
      'The "compactStructuredEncryptionData" command requires Mongo instance configured with auto encryption.'
    );
  });

  context('>= 6.0', function () {
    skipIfApiStrict();
    skipIfServerVersion(testServer, '< 6.0');

    it('can read existing QEv1 data', async function () {
      const uri = await testServer.connectionString();
      const shell = this.startTestShell({
        args: [uri, `--cryptSharedLibPath=${cryptLibrary}`],
      });
      await shell.waitForPrompt();

      await shell.executeLine(`use ${dbname}`);

      await shell.executeLine(`{
        // using the main client without QE, insert fixture data into 6.x that was generated against a 6.x database

        // insert the dataKey that was used to encrypt the payloads used below
        dataKey = new UUID("2871cd1d-8317-4d0c-92be-1ac934ed26b1");
        const dataKeyDoc =  {
          _id: new UUID("2871cd1d-8317-4d0c-92be-1ac934ed26b1"),
          keyMaterial: Binary(Buffer.from("519e2b15d20f00955a3960aab31e70a8e3fdb661129ef0d8a752291599488f8fda23ca64ddcbced93dbc715d03f45ab53a8e8273f2230c41c0e64d9ef746d6959cbdc1abcf0e9d020856e2da09a91ef129ac60ef13a98abcd5ee0cbfba21f1de153974996ab002bddccf7dc0268fed90a172dc373e90b63bc2369a5a1bfc78e0c2d7d81e65e970a38ca585248fef53b70452687024b8ecd308930a25414518e3", "hex"), 0),
          creationDate: ISODate("2023-05-05T10:58:12.473Z"),
          updateDate: ISODate("2023-05-05T10:58:12.473Z"),
          status: 0,
          masterKey: { provider: 'local' }
        };
        db.getCollection('keyVault').insertOne(dataKeyDoc);

        db.runCommand({
          create: 'encryptiontest',
          encryptedFields: {
            fields: [{
              keyId: dataKey,
              path: 'v',
              bsonType: 'string',
              queries: [{ queryType: 'equality' }]
            }]
          }
        })

        // these payloads were encrypted using dataKey
        db.runCommand({
          insert: 'encryptiontest',
          documents: [
            {
              _id: 'asdf',
              v: Binary(Buffer.from("072871cd1d83174d0c92be1ac934ed26b1025438da7f9034a7d6bf03452c9b910381a16b4a0d52592ed6eafc64cc45dde441ac136269b4606f197e939fd54dd9fb257ce2c5afe94853b3b150a9101d65a3063f948ce05350fc4a5811eb5f29793dfd5a9cab77c680bba17f91845895cfd080c123e02a3f1c7e5d5c8c6448a0ac7d624669d0306be6fdcea35106062e742bec39a9873de969196ad95960d4bc247e98dc88a33d9c974646c8283178f3198749c7f24dbd66dc5e7ecf42efc08f64b6a646aa50e872a6f30907b54249039f3226af503d2e2e947323", "hex"), 6),
              __safeContent__: [
                Binary(Buffer.from("91865d04a1a1719e2ef89d66eeb8a35515f22470558831fe9494f011e9a209c3", "hex"), 0)
              ]
            },
            {
              _id: 'ghjk',
              v: Binary(Buffer.from("072871cd1d83174d0c92be1ac934ed26b10299f34210f149673b61f0d369f89290577c410b800ff38ed10eec235aef3677d3594c6371dd5b8f8d4c34769228bf7aea00b1754036a5850a4fef25c40969451151695614ae6142e954bab6c72080b5f43ccac774f6a1791bcc2ca4ca8998b9d5148441180631c7d8136034ff5019ca31a082464ec2fdcf212460a121d14dec3b8ee313541dc46689c79636929f0828dfdef7dfd4d53e1a924bbf70be34b1668d9352f6102a32265ec45d9c5cc0d7cf5f9266cf161497ee5b4a9495e16926b09282c6e4029d22d88e", "hex"), 6),
              __safeContent__: [
                Binary(Buffer.from("b04e26633d569cb47b9cbec650d812a597ffdadacb9a61ee7b1661f52228d661", "hex"), 0)
              ]
            }
          ],
          bypassDocumentValidation: true
        });

        db.runCommand({
          insert: 'enxcol_.encryptiontest.ecoc',
          documents: [
            {
              _id: ObjectId("6454e14689ef42f381f7336b"),
              fieldName: 'v',
              value: Binary(Buffer.from("3eb89d3a95cf955ca0c8c56e54018657a45daaf465dd967d9b24895a188d7e3055734f3c0af88302ceab460874f3806fe52fa4541c9f4b32b5cee6c5a6df9399da664f576dd9bde23bce92f5deea0cb3", "hex"), 0)
            },
            {
              _id: ObjectId("6454e14689ef42f381f73385"),
              fieldName: 'v',
              value: Binary(Buffer.from("2299cd805a28efb6503120e0250798f1b19137d8234690d12eb7e3b7fa74edd28e80c26022c00d53f5983f16e7b5abb7c3b95e30f265a7ba36adb290eda39370b30cedba960a4002089eb5de2fd118fc", "hex"), 0)
            }
          ],
          bypassDocumentValidation: true
        });

        db.runCommand({
          insert: 'enxcol_.encryptiontest.esc',
          documents: [
            {
              _id: Binary(Buffer.from("51db700df02cbbfa25498921f858d3a9d5568cabb97f7283e7b3c9d0e3520ac4", "hex"), 0),
              value: Binary(Buffer.from("dc7169f28df2c990551b098b8dec8f5b1bfeb65d3f40d0fdb241a518310674a6", "hex"), 0)
            },
            {
              _id: Binary(Buffer.from("948b3d29e335485b0503ffc6ade6bfa6fce664c2a1d14790a523c09223da3f09", "hex"), 0),
              value: Binary(Buffer.from("7622097476c59c0ca5bf9d05a52fe725517e03ad811f6c073b0d0184a9d26131", "hex"), 0)
            }
          ],
          bypassDocumentValidation: true
        });

        // now set up a new client with QE so we can test the automatic decryption
        client = Mongo(${JSON.stringify(uri)}, {
          keyVaultNamespace: '${dbname}.keyVault',
          kmsProviders: { local: { key: 'A'.repeat(128) } }
        });
        coll = client.getDB('${dbname}').encryptiontest;
      }`);
      expect(
        await shell.executeLine('({ count: coll.countDocuments() })')
      ).to.include('{ count: 2 }');

      // We can't search for the encrypted value, but it does get decrypted
      expect(
        await shell.executeLine('coll.findOne({ _id: "ghjk" }).v')
      ).to.include('456');
    });
  });

  context('7.0+', function () {
    skipIfServerVersion(testServer, '< 7.0'); // Queryable Encryption v2 only available on 7.0+

    it('allows explicit enryption with bypassQueryAnalysis', async function () {
      // No --cryptSharedLibPath since bypassQueryAnalysis is also a community edition feature
      const shell = this.startTestShell({ args: ['--nodb'] });
      const uri = JSON.stringify(await testServer.connectionString());

      await shell.waitForPrompt();

      await shell.executeLine(`{
        client = Mongo(${uri}, {
          keyVaultNamespace: '${dbname}.keyVault',
          kmsProviders: { local: { key: 'A'.repeat(128) } },
          bypassQueryAnalysis: true
        });

        keyVault = client.getKeyVault();
        clientEncryption = client.getClientEncryption();

        // Create necessary data key
        dataKey = keyVault.createKey('local');

        coll = client.getDB('${dbname}').encryptiontest;
        client.getDB('${dbname}').createCollection('encryptiontest', {
          encryptedFields: {
            fields: [{
              keyId: dataKey,
              path: 'v',
              bsonType: 'string',
              queries: [{ queryType: 'equality' }]
            }]
          }
        });

        // Encrypt and insert data encrypted with specified data key
        const insertPayload1 = clientEncryption.encrypt(dataKey, '123', {
          algorithm: 'Indexed',
          contentionFactor: 4
        });

        const insertPayload2 = clientEncryption.encrypt(dataKey, '456', {
          algorithm: 'Indexed',
          contentionFactor: 4
        });

        const insertRes1 = coll.insertOne({ v: insertPayload1, _id: 'asdf' });
        const insertRes2 = coll.insertOne({ v: insertPayload2, _id: 'ghjk' });
      }`);
      expect(
        await shell.executeLine('({ count: coll.countDocuments() })')
      ).to.include('{ count: 2 }');

      await shell.executeLine(`
      const findPayload = clientEncryption.encrypt(dataKey, '456', { // NB: the data key is irrelevant here
        algorithm: 'Indexed',
        queryType: 'equality',
        contentionFactor: 4
      });`);

      // Make sure the find payload allows searching for the encrypted value
      expect(
        await shell.executeLine('coll.findOne({ v: findPayload })._id')
      ).to.include('ghjk');
    });

    it('drops fle2 collection with all helper collections when encryptedFields options are in listCollections', async function () {
      const shell = this.startTestShell({
        args: ['--nodb', `--cryptSharedLibPath=${cryptLibrary}`],
      });
      const uri = JSON.stringify(await testServer.connectionString());

      await shell.waitForPrompt();

      await shell.executeLine(
        'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
      );

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
      await shell.executeLine(
        `autoMongo.getDB('${dbname}').createCollection('collfle2');`
      );
      await shell.executeLine(`autoMongo.getDB('${dbname}').collfle2.insertOne({ \
        phoneNumber: '+12874627836445' \
      });`);

      const autoMongoResult = await shell.executeLine(
        `autoMongo.getDB('${dbname}').collfle2.find()`
      );
      expect(autoMongoResult).to.include("phoneNumber: '+12874627836445'");

      await shell.executeLine(`plainMongo = Mongo(${uri});`);

      const plainMongoResult = await shell.executeLine(
        `plainMongo.getDB('${dbname}').collfle2.find()`
      );
      expect(plainMongoResult).to.include(
        'phoneNumber: Binary.createFromBase64('
      );
      expect(plainMongoResult).to.not.include("phoneNumber: '+12874627836445'");

      let collections = await shell.executeLine(
        `plainMongo.getDB('${dbname}').getCollectionNames()`
      );

      expect(collections).to.include('enxcol_.collfle2.esc');
      expect(collections).to.include('enxcol_.collfle2.ecoc');
      expect(collections).to.include('collfle2');

      await shell.executeLine(`plainMongo.getDB('${dbname}').collfle2.drop();`);

      collections = await shell.executeLine(
        `plainMongo.getDB('${dbname}').getCollectionNames()`
      );

      expect(collections).to.not.include('enxcol_.collfle2.esc');
      expect(collections).to.not.include('enxcol_.collfle2.ecoc');
      expect(collections).to.not.include('collfle2');
    });

    it('creates an encrypted collection and generates data encryption keys automatically per encrypted fields', async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      const uri = JSON.stringify(await testServer.connectionString());
      await shell.waitForPrompt();
      await shell.executeLine(
        'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
      );
      await shell.executeLine(`keyMongo = Mongo(${uri}, {
        keyVaultNamespace: '${dbname}.keyVault',
        kmsProviders: { local },
        explicitEncryptionOnly: true
      });`);
      await shell.executeLine(`secretDB = keyMongo.getDB('${dbname}')`);
      await shell.executeLine(`var { collection, encryptedFields } = secretDB.createEncryptedCollection('secretCollection', {
        provider: 'local',
        createCollectionOptions: {
          encryptedFields: {
            fields: [{
              keyId: null,
              path: 'secretField',
              bsonType: 'string'
            }]
          }
        }
      });`);

      await shell.executeLine(`plainMongo = Mongo(${uri});`);
      const collections = await shell.executeLine(
        `plainMongo.getDB('${dbname}').getCollectionNames()`
      );
      expect(collections).to.include('enxcol_.secretCollection.esc');
      expect(collections).to.include('enxcol_.secretCollection.ecoc');
      expect(collections).to.include('secretCollection');

      const dekCount = await shell.executeLine(
        `plainMongo.getDB('${dbname}').getCollection('keyVault').countDocuments()`
      );
      // Since there is only one field to be encrypted hence there would only be one DEK in our keyvault collection
      expect(parseInt(dekCount.trim(), 10)).to.equal(1);
    });
  });

  context('8.0+', function () {
    skipIfServerVersion(testServer, '< 8.0'); // Queryable Encryption v2 only available on 7.0+

    const rangeType = 'range';
    const rangeAlgorithm = 'Range';
    const rangeOptions = `{
      sparsity: Long(1),
      trimFactor: 1,
      min: new Date('1970'),
      max: new Date('2100')
    }`;

    it('allows compactStructuredEncryptionData command when mongo instance configured with auto encryption', async function () {
      const shell = this.startTestShell({
        args: ['--nodb', `--cryptSharedLibPath=${cryptLibrary}`],
      });
      const uri = JSON.stringify(await testServer.connectionString());

      await shell.waitForPrompt();

      await shell.executeLine(
        'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
      );

      await shell.executeLine(`keyMongo = Mongo(${uri}, { \
        keyVaultNamespace: '${dbname}.keyVault', \
        kmsProviders: { local } \
      });`);

      await shell.executeLine('keyVault = keyMongo.getKeyVault();');
      await shell.executeLine('keyId = keyVault.createKey("local");');

      await shell.executeLine(`encryptedFieldsMap = { \
        '${dbname}.test': { \
          fields: [{ path: 'phoneNumber', keyId, bsonType: 'string' }] \
        } \
      };`);

      await shell.executeLine(`autoMongo = Mongo(${uri}, { \
        keyVaultNamespace: '${dbname}.keyVault', \
        kmsProviders: { local }, \
        encryptedFieldsMap \
      });`);

      await shell.executeLine(
        `autoMongo.getDB('${dbname}').createCollection('test', { encryptedFields: { fields: [] } });`
      );
      await shell.executeLine(`autoMongo.getDB('${dbname}').test.insertOne({ \
        phoneNumber: '+12874627836445' \
      });`);

      const compactResult = await shell.executeLine(
        `autoMongo.getDB('${dbname}').test.compactStructuredEncryptionData()`
      );
      expect(compactResult).to.include('ok: 1');
    });

    it('creates an encrypted collection and generates data encryption keys automatically per encrypted fields', async function () {
      const shell = this.startTestShell({ args: ['--nodb'] });
      const uri = JSON.stringify(await testServer.connectionString());
      await shell.waitForPrompt();
      await shell.executeLine(
        'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
      );
      await shell.executeLine(`keyMongo = Mongo(${uri}, {
        keyVaultNamespace: '${dbname}.keyVault',
        kmsProviders: { local },
        explicitEncryptionOnly: true
      });`);
      await shell.executeLine(`secretDB = keyMongo.getDB('${dbname}')`);
      await shell.executeLine(`var { collection, encryptedFields } = secretDB.createEncryptedCollection('secretCollection', {
        provider: 'local',
        createCollectionOptions: {
          encryptedFields: {
            fields: [{
              keyId: null,
              path: 'secretField',
              bsonType: 'string'
            }]
          }
        }
      });`);

      await shell.executeLine(`plainMongo = Mongo(${uri});`);
      const collections = await shell.executeLine(
        `plainMongo.getDB('${dbname}').getCollectionNames()`
      );
      expect(collections).to.include('enxcol_.secretCollection.esc');
      expect(collections).to.include('enxcol_.secretCollection.ecoc');
      expect(collections).to.include('secretCollection');

      const dekCount = await shell.executeLine(
        `plainMongo.getDB('${dbname}').getCollection('keyVault').countDocuments()`
      );
      // Since there is only one field to be encrypted hence there would only be one DEK in our keyvault collection
      expect(parseInt(dekCount.trim(), 10)).to.equal(1);
    });

    it('allows explicit range encryption with bypassQueryAnalysis', async function () {
      // No --cryptSharedLibPath since bypassQueryAnalysis is also a community edition feature
      const shell = this.startTestShell({ args: ['--nodb'] });
      const uri = JSON.stringify(await testServer.connectionString());

      await shell.waitForPrompt();

      await shell.executeLine(`{
        client = Mongo(${uri}, {
          keyVaultNamespace: '${dbname}.keyVault',
          kmsProviders: { local: { key: 'A'.repeat(128) } },
          bypassQueryAnalysis: true
        });

        keyVault = client.getKeyVault();
        clientEncryption = client.getClientEncryption();

        // Create necessary data key
        dataKey = keyVault.createKey('local');

        coll = client.getDB('${dbname}').encryptiontest;
        client.getDB('${dbname}').createCollection('encryptiontest', {
          encryptedFields: {
            fields: [{
              keyId: dataKey,
              path: 'v',
              bsonType: 'date',
              queries: [{
                queryType: '${rangeType}',
                contention: 4,
                ...${rangeOptions}
              }]
            }]
          }
        });

        // Encrypt and insert data encrypted with specified data key
        for (let year = 1990; year < 2010; year++) {
          const insertPayload = clientEncryption.encrypt(
            dataKey,
            new Date(year + '-02-02T12:45:16.277Z'),
            {
              algorithm: '${rangeAlgorithm}',
              contentionFactor: 4,
              rangeOptions: ${rangeOptions}
            });
          coll.insertOne({ v: insertPayload, year });
        }
      }`);
      expect(
        await shell.executeLine('({ count: coll.countDocuments() })')
      ).to.include('{ count: 20 }');

      await shell.executeLine(`{
      findPayload = clientEncryption.encryptExpression(dataKey, {
        $and: [ { v: {$gt: new Date('1992')} }, { v: {$lt: new Date('1999')} } ]
      }, {
        algorithm: '${rangeAlgorithm}',
        queryType: '${rangeType}',
        contentionFactor: 4,
        rangeOptions: ${rangeOptions}
      });
      }`);

      // Make sure the find payload allows searching for the encrypted values
      const out = await shell.executeLine(
        "\
        coll.find(findPayload) \
          .toArray() \
          .map(d => d.year) \
          .sort() \
          .join(',')"
      );
      expect(out).to.include('1992,1993,1994,1995,1996,1997,1998');
    });

    it('allows automatic range encryption', async function () {
      const shell = this.startTestShell({
        args: ['--nodb', `--cryptSharedLibPath=${cryptLibrary}`],
      });
      const uri = JSON.stringify(await testServer.connectionString());

      await shell.waitForPrompt();

      await shell.executeLine(`{
        client = Mongo(${uri}, {
          keyVaultNamespace: '${dbname}.keyVault',
          kmsProviders: { local: { key: 'A'.repeat(128) } }
        });

        dataKey = client.getKeyVault().createKey('local');

        coll = client.getDB('${dbname}').encryptiontest;
        client.getDB('${dbname}').createCollection('encryptiontest', {
          encryptedFields: {
            fields: [{
              keyId: dataKey,
              path: 'v',
              bsonType: 'date',
              queries: [{
                queryType: '${rangeType}',
                contention: 4,
                ...${rangeOptions}
              }]
            }]
          }
        });

        for (let year = 1990; year < 2010; year++) {
          coll.insertOne({ v: new Date(year + '-02-02T12:45:16.277Z'), year })
        }
      }`);
      expect(
        await shell.executeLine('({ count: coll.countDocuments() })')
      ).to.include('{ count: 20 }');

      // Make sure the find payload allows searching for the encrypted values
      const out = await shell.executeLine(
        "\
        coll.find({ v: {$gt: new Date('1992'), $lt: new Date('1999') } }) \
          .toArray() \
          .map(d => d.year) \
          .sort() \
          .join(',')"
      );
      expect(out).to.include('1992,1993,1994,1995,1996,1997,1998');
    });
  });

  context('8.2+', function () {
    skipIfServerVersion(testServer, '< 8.2');

    context('$lookup support', function () {
      skipIfCommunityServer(testServer);

      it('allows $lookup with a collection with automatic encryption', async function () {
        const shell = this.startTestShell({
          args: [
            `--cryptSharedLibPath=${cryptLibrary82}`,
            await testServer.connectionString(),
          ],
        });
        await shell.waitForPrompt();
        await shell.executeLine(`{
      const keyMongo = Mongo(
        db.getMongo(),
        {
          keyVaultNamespace: '${dbname}.__keyVault',
          kmsProviders: { local: { key: 'A'.repeat(128) } },
        }
      );

      const keyVault = keyMongo.getKeyVault();

      const dataKey1 = keyVault.createKey('local');
      const dataKey2 = keyVault.createKey('local');

      const schemaMap = {
        ['${dbname}.coll1']: {
          bsonType: 'object',
          properties: {
            phoneNumber: {
              encrypt: {
                bsonType: 'string',
                keyId: [dataKey1],
                algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              },
            },
            key: {
              bsonType: 'string',
            },
          },
        },
        ['${dbname}.coll2']: {
          bsonType: 'object',
          properties: {
            phoneNumber: {
              encrypt: {
                bsonType: 'string',
                keyId: [dataKey2],
                algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
              },
            },
            key: {
              bsonType: 'string',
            },
          },
        },
      };

      autoMongo = new Mongo(db.getMongo(), {
        keyVaultNamespace: '${dbname}.__keyVault',
        kmsProviders: { local: { key: 'A'.repeat(128) } },
        schemaMap,
      });

      coll1 = autoMongo.getDB('${dbname}').getCollection('coll1');
      coll1.insertMany([
        { phoneNumber: '123-456-7890', key: 'foo' },
        { phoneNumber: '123-456-7891', key: 'bar' },
      ]);

      coll2 = autoMongo.getDB('${dbname}').getCollection('coll2');
      coll2.insertMany([
        { phoneNumber: '123-456-7892', key: 'baz' },
        { phoneNumber: '123-456-7893', key: 'foo' },
      ]);
      }`);
        const result = await shell.executeLineWithJSONResult(`(
        coll1.aggregate([
          {
            $lookup: {
              from: 'coll2',
              localField: 'key',
              foreignField: 'key',
              as: 'lookupMatch',
            },
          },
        ])
        .map(({ key, lookupMatch }) => ({ key, size: lookupMatch.length }))
        .toArray())`);
        expect(result).to.deep.equal([
          { key: 'foo', size: 1 },
          { key: 'bar', size: 0 },
        ]);
      });
    });

    for (const mode of ['automatic', 'explicit'] as const)
      context(
        `Queryable Encryption Prefix/Suffix/Substring Support ${mode}`,
        function () {
          // Substring prefix support is enterprise-only 8.2+
          skipIfCommunityServer(testServer);

          let shell: TestShell;

          const testCollection = 'qeSubstringTest';

          beforeEach(async function () {
            shell = this.startTestShell({
              args: [
                `--cryptSharedLibPath=${cryptLibrary82}`,
                await testServer.connectionString(),
              ],
            });
            await shell.waitForPrompt();

            // Shared setup for all substring search tests - create collection once
            await shell.executeLine(`{
        mode = ${JSON.stringify(mode)};
        opts = {
          keyVaultNamespace: '${dbname}.__keyVault',
          kmsProviders: { local: { key: 'A'.repeat(128) } },
        };

        // Setup explicit encryption client
        explicitMongo = Mongo(db.getMongo(), { ...opts, bypassQueryAnalysis: true });
        if (mode === 'automatic') {
          autoMongo = Mongo(db.getMongo(), { ...opts });
          coll = autoMongo.getDB('${dbname}').${testCollection};
        }

        keyId1 = explicitMongo.getKeyVault().createKey('local');
        keyId2 = explicitMongo.getKeyVault().createKey('local');

        substringOptions = {
          strMinQueryLength: 2,
          strMaxQueryLength: 10,
        };
        encryptedFieldOptions = {
          ...substringOptions,
          caseSensitive: false,
          diacriticSensitive: false,
          contention: 4
        };

        explicitMongo.getClientEncryption().createEncryptedCollection('${dbname}', '${testCollection}', {
          provider: 'local',
          createCollectionOptions: {
            encryptedFields: {
              fields: [{
                keyId: keyId1,
                path: 'substringData',
                bsonType: 'string',
                queries: [{
                  queryType: 'substringPreview',
                  strMaxLength: 60,
                  ...encryptedFieldOptions
                }]
              }, {
                keyId: keyId2,
                path: 'prefixSuffixData',
                bsonType: 'string',
                queries: [{
                  queryType: 'prefixPreview',
                  ...encryptedFieldOptions
                }, {
                  queryType: 'suffixPreview',
                  ...encryptedFieldOptions
                }]
              }]
            }
          }
        });

        ce = explicitMongo.getClientEncryption();
        ecoll = explicitMongo.getDB('${dbname}').${testCollection};

        explicitOpts = (details) => ({
          algorithm: 'TextPreview',
          contentionFactor: 4,
          textOptions: { caseSensitive: false, diacriticSensitive: false, ...details }
        });
        substringOpts = explicitOpts({ substring: { ...substringOptions, strMaxLength: 60 } });
        prefixSuffixOpts = explicitOpts({ prefix: substringOptions, suffix: substringOptions });
        methods = {
          substring: { queryType: 'substringPreview', keyId: keyId1, options: substringOpts },
          prefix: { queryType: 'prefixPreview', keyId: keyId2, options: prefixSuffixOpts },
          suffix: { queryType: 'suffixPreview', keyId: keyId2, options: prefixSuffixOpts }
        }
        explicitEncrypt = (method, data) => {
          return ce.encrypt(methods[method].keyId, data, {
            ...methods[method].options,
            queryType: methods[method].queryType
          });
        };
      }`);
          });

          afterEach(function () {
            shell.kill();
          });

          it('allows queryable encryption with prefix searches', async function () {
            // Insert test data for prefix searches
            await shell.executeLine(`{
            for (const data of [
            'admin_user_123.txt',
            'admin_super_456.pdf',
            'user_regular_789.pdf',
            'guest_access_000.txt',
            'just_user.txt',
            'admin_explicit_test.pdf'
          ]) {
              if (mode === 'automatic') {
                coll.insertOne({
                  substringData: data,
                  prefixSuffixData: data
                });
              } else {
                ecoll.insertOne({
                  substringData: ce.encrypt(keyId1, data, substringOpts),
                  prefixSuffixData: ce.encrypt(keyId2, data, prefixSuffixOpts)
                });
              }
            }
      }`);
            const automaticEncrypt = (_method: string, data: string) =>
              JSON.stringify(data);
            const explicitEncrypt = (method: string, data: string) =>
              `explicitEncrypt('${method}', ${JSON.stringify(data)})`;
            const s = sortObjectArray;

            for (const [coll, maybeEncrypt] of mode === 'explicit'
              ? ([['ecoll', explicitEncrypt]] as const)
              : ([
                  ['coll', automaticEncrypt],
                  ['ecoll', explicitEncrypt],
                ] as const)) {
              const prefixResults = await shell.executeLineWithJSONResult(
                `${coll}.find({$expr: { $and: [{$encStrStartsWith: {prefix: ${maybeEncrypt(
                  'prefix',
                  'admin_'
                )}, input: "$prefixSuffixData"}}] }}, { data: '$prefixSuffixData', _id: 0 }).toArray()`
              );
              expect(s(prefixResults)).to.deep.equal(
                s([
                  {
                    data: 'admin_user_123.txt',
                  },
                  {
                    data: 'admin_super_456.pdf',
                  },
                  {
                    data: 'admin_explicit_test.pdf',
                  },
                ])
              );

              const suffixResults = await shell.executeLineWithJSONResult(`
              ${coll}.find({$expr: { $and: [{$encStrEndsWith: {suffix: ${maybeEncrypt(
                'suffix',
                '.pdf'
              )}, input: "$prefixSuffixData"}}] }}, { data: '$prefixSuffixData', _id: 0 }).toArray()
            `);
              expect(s(suffixResults)).to.deep.equal(
                s([
                  {
                    data: 'admin_super_456.pdf',
                  },
                  {
                    data: 'user_regular_789.pdf',
                  },
                  {
                    data: 'admin_explicit_test.pdf',
                  },
                ])
              );

              const substringResults = await shell.executeLineWithJSONResult(`
              ${coll}.find({$expr: { $and: [{$encStrContains: {substring: ${maybeEncrypt(
                'substring',
                'user'
              )}, input: "$substringData"}}] }}, { data: '$substringData', _id: 0 }).toArray()
            `);
              expect(s(substringResults)).to.deep.equal(
                s([
                  {
                    data: 'user_regular_789.pdf',
                  },
                  {
                    data: 'admin_user_123.txt',
                  },
                  {
                    data: 'just_user.txt',
                  },
                ])
              );
            }
          });
        }
      );
  });

  context('pre-6.0', function () {
    skipIfServerVersion(testServer, '>= 6.0'); // FLE2 available on 6.0+

    it('provides a good error message when createCollection fails due to low server version', async function () {
      const shell = this.startTestShell({
        args: [
          `--cryptSharedLibPath=${cryptLibrary}`,
          await testServer.connectionString(),
        ],
      });
      await shell.waitForPrompt();
      const result = await shell.executeLine(
        `db.getSiblingDB('${dbname}').createCollection('test', { encryptedFields: { fields: [] } });`
      );
      expect(result).to.match(/Upgrade server to use Queryable Encryption./);
    });

    it('provides a good error message when createCollection fails due to low FCV', async function () {
      const shell = this.startTestShell({
        args: [
          `--cryptSharedLibPath=${cryptLibrary}`,
          await testServer.connectionString(),
        ],
      });
      await shell.waitForPrompt();
      await shell.executeLine(`db = db.getSiblingDB('${dbname}')`);
      await shell.executeLine("db.version = () => '6.0.0'");
      const result = await shell.executeLine(
        "db.createCollection('test', { encryptedFields: { fields: [] } });"
      );
      expect(result).to.match(/Upgrade server to use Queryable Encryption./);
    });
  });

  it('performs KeyVault data key management as expected', async function () {
    const shell = this.startTestShell({
      args: [
        await testServer.connectionString(),
        `--cryptSharedLibPath=${cryptLibrary}`,
      ],
    });
    await shell.waitForPrompt();
    // Wrapper for executeLine that expects single-line output
    const runSingleLine = async (line: string) =>
      (await shell.executeLine(line)).split('\n')[0].trim();
    await runSingleLine(
      'local = { key: BinData(0, "kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY") }'
    );
    await runSingleLine(`keyMongo = Mongo(db.getMongo(), { \
      keyVaultNamespace: '${dbname}.keyVault', \
      kmsProviders: { local }, \
      explicitEncryptionOnly: true \
    });`);
    await runSingleLine(`use('${dbname}')`);
    await runSingleLine('keyVault = keyMongo.getKeyVault();');
    await runSingleLine(
      'keyId = keyVault.createKey("local", "", ["testaltname"]);'
    );
    expect(
      await runSingleLine(
        'db.keyVault.countDocuments({ _id: keyId, keyAltNames: "testaltname" })'
      )
    ).to.equal('1');
    expect(
      await runSingleLine(
        'keyVault.getKey(keyId)._id.toString() == keyId.toString()'
      )
    ).to.equal('true');
    expect(
      await runSingleLine(
        'keyVault.getKeys().next()._id.toString() == keyId.toString()'
      )
    ).to.equal('true');
    expect(
      await runSingleLine(
        'keyVault.addKeyAlternateName(keyId, "otheraltname").keyAltNames.join(",")'
      )
    ).to.equal('testaltname');
    expect(
      await runSingleLine(
        'keyVault.getKeyByAltName("otheraltname").keyAltNames.join(",")'
      )
    ).to.equal('testaltname,otheraltname');
    expect(
      await runSingleLine(
        'keyVault.removeKeyAlternateName(keyId, "testaltname").keyAltNames.join(",")'
      )
    ).to.equal('testaltname,otheraltname');
    expect(
      await runSingleLine(
        'keyVault.getKeyByAltName("otheraltname").keyAltNames.join(",")'
      )
    ).to.equal('otheraltname');
    expect(
      await runSingleLine('keyVault.deleteKey(keyId).deletedCount')
    ).to.equal('1');
    expect(await runSingleLine('db.keyVault.countDocuments()')).to.equal('0');
  });
});
