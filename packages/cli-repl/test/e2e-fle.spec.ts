import { expect } from 'chai';
import { MongoClient } from 'mongodb';
import { TestShell } from './test-shell';
import { eventually } from '../../../testing/eventually';
import {
  startTestServer,
  skipIfApiStrict,
  skipIfServerVersion,
  skipIfCommunityServer,
  downloadCurrentCryptSharedLibrary,
} from '../../../testing/integration-testing-hooks';
import { makeFakeHTTPServer, fakeAWSHandlers } from '../../../testing/fake-kms';
import { once } from 'events';
import { serialize } from 'v8';
import { inspect } from 'util';
import path from 'path';
import os from 'os';

function isMacosTooOldForQE() {
  // Indexed search is not supported on macOS 10.14 (which in turn is
  // not supported by 6.0+ servers anyway).
  // See e.g. https://jira.mongodb.org/browse/MONGOCRYPT-440
  return os.type() === 'Darwin' && +os.release().split('.')[0] < 20;
}

describe('FLE tests', function () {
  const testServer = startTestServer('not-shared', {
    topology: 'replset',
    secondaries: 0,
  });
  skipIfServerVersion(testServer, '< 4.2'); // FLE only available on 4.2+
  skipIfCommunityServer(testServer); // FLE is enterprise-only
  let kmsServer: ReturnType<typeof makeFakeHTTPServer>;
  let dbname: string;
  let cryptLibrary: string;

  before(async function () {
    kmsServer = makeFakeHTTPServer(fakeAWSHandlers);
    kmsServer.listen(0);
    await once(kmsServer, 'listening');
    cryptLibrary = await downloadCurrentCryptSharedLibrary();
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
  afterEach(TestShell.cleanup);

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
      async function makeTestShell(): Promise<TestShell> {
        const shell = TestShell.start({
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
          cwd: path.join(__dirname, 'fixtures'),
        });

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
        const shell = await makeTestShell();
        await shell.executeLine(`db.keyVault.insertOne({
          _id: UUID("e7b4abe7-ff70-48c3-9d3a-3526e18c2646"),
          keyMaterial: Binary.createFromBase64("AQICAHiIt7kIn5z4FgWcTALt8TnVAidSiyp0pcmRDIkJXUWp0QEzvUwEfyumENetTvzJRfhjAAAAwjCBvwYJKoZIhvcNAQcGoIGxMIGuAgEAMIGoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDPQGucywD4PdYy526QIBEIB7nCs6Z2dG4QSG7GRGjUXsicrDD1mBK3EfwkUwGIFmxIH09Ks3bCWPj1Sv/chSNGj90HuE53shoUAIoj+20RHAXrQoe3uXPzpg1cfYcHQRm0JEdzZsvnLDHaj8drj3LjH2CcO0I8WZ0+SlnCHkoP4ifr4apTA4y5T3nEV7"),
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
          taxid: Binary.createFromBase64("Aue0q+f/cEjDnTo1JuGMJkYChG8SL6jBrhuK/z3HwgqKPbyVVB6NDXXLja8LfjE31VOniMy2LjH+0tqY6jpZaXLG3HwXu+b5qe3Dp/PirZaoGQ==")
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
            req.headers.authorization.includes(accessKeyId)
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
        const shell = await makeTestShell();
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
    const shell = TestShell.start({
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
    expect(keyVaultContents).to.include(uuidRegexp.exec(keyId)[1]);
  });

  it('works when a schemaMap option has been passed', async function () {
    const shell = TestShell.start({
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
    expect(keyVaultContents).to.include(uuidRegexp.exec(keyId)[1]);

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
    const shell = TestShell.start({
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
    const shell = TestShell.start({
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
      const shell = TestShell.start({
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
          keyMaterial: Binary.createFromBase64("UZ4rFdIPAJVaOWCqsx5wqOP9tmESnvDYp1IpFZlIj4/aI8pk3cvO2T28cV0D9Fq1Oo6Cc/IjDEHA5k2e90bWlZy9wavPDp0CCFbi2gmpHvEprGDvE6mKvNXuDL+6IfHeFTl0mWqwAr3cz33AJo/tkKFy3Dc+kLY7wjaaWhv8eODC19geZelwo4ylhSSP71O3BFJocCS47NMIkwolQUUY4w=="),
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
              v: Binary.createFromBase64("ByhxzR2DF00Mkr4ayTTtJrECVDjaf5A0p9a/A0Usm5EDgaFrSg1SWS7W6vxkzEXd5EGsE2JptGBvGX6Tn9VN2fslfOLFr+lIU7OxUKkQHWWjBj+UjOBTUPxKWBHrXyl5Pf1anKt3xoC7oX+RhFiVz9CAwSPgKj8cfl1cjGRIoKx9YkZp0DBr5v3Oo1EGBi50K+w5qYc96WkZatlZYNS8JH6Y3IijPZyXRkbIKDF48xmHScfyTb1m3F5+z0LvwI9ktqZGqlDocqbzCQe1QkkDnzImr1A9Li6UcyM="),
              __safeContent__: [
                Binary.createFromBase64("kYZdBKGhcZ4u+J1m7rijVRXyJHBViDH+lJTwEemiCcM=")
              ]
            },
            {
              _id: 'ghjk',
              v: Binary.createFromBase64("ByhxzR2DF00Mkr4ayTTtJrECmfNCEPFJZzth8NNp+JKQV3xBC4AP847RDuwjWu82d9NZTGNx3VuPjUw0dpIov3rqALF1QDalhQpP7yXECWlFEVFpVhSuYULpVLq2xyCAtfQ8ysd09qF5G8wspMqJmLnVFIRBGAYxx9gTYDT/UBnKMaCCRk7C/c8hJGChIdFN7DuO4xNUHcRmiceWNpKfCCjf3vff1NU+GpJLv3C+NLFmjZNS9hAqMiZexF2cXMDXz1+SZs8WFJfuW0qUleFpJrCSgsbkAp0i2I4="),
              __safeContent__: [
                Binary.createFromBase64("sE4mYz1WnLR7nL7GUNgSpZf/2trLmmHuexZh9SIo1mE=")
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
              value: Binary.createFromBase64("PridOpXPlVygyMVuVAGGV6RdqvRl3ZZ9mySJWhiNfjBVc088CviDAs6rRgh084Bv5S+kVByfSzK1zubFpt+TmdpmT1dt2b3iO86S9d7qDLM=")
            },
            {
              _id: ObjectId("6454e14689ef42f381f73385"),
              fieldName: 'v',
              value: Binary.createFromBase64("IpnNgFoo77ZQMSDgJQeY8bGRN9gjRpDRLrfjt/p07dKOgMJgIsANU/WYPxbntau3w7leMPJlp7o2rbKQ7aOTcLMM7bqWCkACCJ613i/RGPw=")
            }
          ],
          bypassDocumentValidation: true
        });

        db.runCommand({
          insert: 'enxcol_.encryptiontest.esc',
          documents: [
            {
              _id: Binary.createFromBase64("UdtwDfAsu/olSYkh+FjTqdVWjKu5f3KD57PJ0ONSCsQ="),
              value: Binary.createFromBase64("3HFp8o3yyZBVGwmLjeyPWxv+tl0/QND9skGlGDEGdKY=")
            },
            {
              _id: Binary.createFromBase64("lIs9KeM1SFsFA//Grea/pvzmZMKh0UeQpSPAkiPaPwk="),
              value: Binary.createFromBase64("diIJdHbFnAylv50FpS/nJVF+A62BH2wHOw0BhKnSYTE=")
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

    it('allows explicit encryption with bypassQueryAnalysis', async function () {
      if (isMacosTooOldForQE()) {
        return this.skip();
      }

      // No --cryptSharedLibPath since bypassQueryAnalysis is also a community edition feature
      const shell = TestShell.start({ args: ['--nodb'] });
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
      const shell = TestShell.start({
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
      expect(plainMongoResult).to.include('phoneNumber: Binary(Buffer.from');
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

    it('allows compactStructuredEncryptionData command when mongo instance configured with auto encryption', async function () {
      const shell = TestShell.start({
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
      const shell = TestShell.start({ args: ['--nodb'] });
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
      if (isMacosTooOldForQE()) {
        return this.skip();
      }

      // No --cryptSharedLibPath since bypassQueryAnalysis is also a community edition feature
      const shell = TestShell.start({ args: ['--nodb'] });
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

        rangeOptions = {
          sparsity: Long(1),
          min: new Date('1970'),
          max: new Date('2100')
        };
        coll = client.getDB('${dbname}').encryptiontest;
        client.getDB('${dbname}').createCollection('encryptiontest', {
          encryptedFields: {
            fields: [{
              keyId: dataKey,
              path: 'v',
              bsonType: 'date',
              queries: [{
                queryType: 'rangePreview',
                contention: 4,
                ...rangeOptions
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
              algorithm: 'RangePreview',
              contentionFactor: 4,
              rangeOptions
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
        algorithm: 'RangePreview',
        queryType: 'rangePreview',
        contentionFactor: 4,
        rangeOptions
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
      if (isMacosTooOldForQE()) {
        return this.skip();
      }

      const shell = TestShell.start({
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
                queryType: 'rangePreview',
                contention: 4,
                sparsity: 1,
                min: new Date('1970'),
                max: new Date('2100')
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

  context('pre-6.0', function () {
    skipIfServerVersion(testServer, '>= 6.0'); // FLE2 available on 6.0+

    it('provides a good error message when createCollection fails due to low server version', async function () {
      const shell = TestShell.start({
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
      const shell = TestShell.start({
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
    const shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        `--cryptSharedLibPath=${cryptLibrary}`,
      ],
    });
    await shell.waitForPrompt();
    // Wrapper for executeLine that expects single-line output
    const runSingleLine = async (line) =>
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

  it('allows a migration path for users from cursor getKey[ByAltName] to single document getKey[ByAltName]', async function () {
    const shell = TestShell.start({
      args: [
        await testServer.connectionString(),
        `--cryptSharedLibPath=${cryptLibrary}`,
      ],
    });
    await shell.waitForPrompt();
    // Wrapper for executeLine that expects single-line output
    const runSingleLine = async (line) =>
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

    // Can access values with cursor methods, but get a deprecation warning
    {
      const output = await shell.executeLine(
        'keyVault.getKey(keyId).next().masterKey.provider'
      );
      expect(output).to.include(
        'DeprecationWarning: KeyVault.getKey returns a single document and will stop providing cursor methods in future versions of mongosh'
      );
      expect(output).to.match(/\blocal\b/);
    }
    {
      const output = await shell.executeLine(
        'keyVault.getKeyByAltName("testaltname").next().masterKey.provider'
      );
      expect(output).to.include(
        'DeprecationWarning: KeyVault.getKeyByAltName returns a single document and will stop providing cursor methods in future versions of mongosh'
      );
      expect(output).to.match(/\blocal\b/);
    }

    // Can access values on document directly
    {
      const output = await shell.executeLine(
        'keyVault.getKey(keyId).masterKey.provider'
      );
      expect(output).to.not.include('DeprecationWarning');
      expect(output).to.match(/\blocal\b/);
    }
    {
      const output = await shell.executeLine(
        'keyVault.getKeyByAltName("testaltname").masterKey.provider'
      );
      expect(output).to.not.include('DeprecationWarning');
      expect(output).to.match(/\blocal\b/);
    }

    // Works when no doc is returned
    {
      const output = await shell.executeLine('keyVault.getKey("nonexistent")');
      expect(output).to.include(
        'no result -- will return `null` in future mongosh versions'
      );
    }
    {
      const output = await shell.executeLine(
        'keyVault.getKeyByAltName("nonexistent")'
      );
      expect(output).to.include(
        'no result -- will return `null` in future mongosh versions'
      );
    }

    // Hack to reset deprecation warning cache
    await shell.executeLine(
      'db.getMongo()._instanceState.warningsShown.clear()'
    );

    // Works when no doc is returned with cursor methods
    {
      const output = await shell.executeLine(
        'keyVault.getKey("nonexistent").next()'
      );
      expect(output).to.include('DeprecationWarning');
      expect(output).to.match(/\bnull\b/);
    }
    {
      const output = await shell.executeLine(
        'keyVault.getKeyByAltName("nonexistent").next()'
      );
      expect(output).to.include('DeprecationWarning');
      expect(output).to.match(/\bnull\b/);
    }
  });
});
