import { MongoshInvalidInputError } from '@mongosh/errors';
import type {
  ClientEncryption as FLEClientEncryption,
  ClientEncryptionTlsOptions,
  ServiceProvider,
  ClientEncryptionEncryptOptions,
  ClientEncryptionDataKeyProvider,
} from '@mongosh/service-provider-core';
import { bson } from '@mongosh/service-provider-core';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';
import { Duplex } from 'stream';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface } from 'ts-sinon';
import type Database from './database';
import { signatures, toShellResult } from './decorators';
import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ALL_API_VERSIONS,
} from './enums';
import type {
  ClientSideFieldLevelEncryptionOptions,
  ClientSideFieldLevelEncryptionKmsProvider as KMSProvider,
} from './field-level-encryption';
import { ClientEncryption, KeyVault } from './field-level-encryption';
import Mongo from './mongo';
import ShellInstanceState from './shell-instance-state';
import { CliServiceProvider } from '../../service-provider-server';
import { startTestServer } from '../../../testing/integration-testing-hooks';
import {
  makeFakeHTTPConnection,
  fakeAWSHandlers,
} from '../../../testing/fake-kms';
import { inspect } from 'util';
import Collection from './collection';
import { dummyOptions } from './helpers.spec';

const KEY_ID = new bson.Binary('MTIzNA==');
const DB = 'encryption';
const COLL = 'keys';
const SCHEMA_MAP = {
  'fle-example.people': {
    properties: {
      ssn: {
        encrypt: {
          keyId: '/keyAltName',
          bsonType: 'string',
          algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
        },
      },
    },
    bsonType: 'object',
  },
};
const AWS_KMS = {
  keyVaultNamespace: `${DB}.${COLL}`,
  kmsProviders: {
    aws: {
      accessKeyId: 'abc',
      secretAccessKey: '123',
    },
  },
  schemaMap: SCHEMA_MAP,
  bypassAutoEncryption: true,
};

const ALGO = 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic';
const ENCRYPT_OPTIONS = {
  algorithm: ALGO as ClientEncryptionEncryptOptions['algorithm'],
  contentionFactor: 10,
  queryType: 'Equality' as ClientEncryptionEncryptOptions['queryType'],
};

const createFakeDB = (name: string) => ({ name });
const RAW_CLIENT = {
  client: 1,
  db: (name: string) => createFakeDB(name),
} as any;

function getCertPath(filename: string): string {
  return path.join(
    __dirname,
    '..',
    '..',
    '..',
    'testing',
    'certificates',
    filename
  );
}

describe('Field Level Encryption', function () {
  let sp: StubbedInstance<ServiceProvider>;
  let mongo: Mongo;
  let instanceState: ShellInstanceState;
  let libmongoc: StubbedInstance<FLEClientEncryption>;
  let clientEncryption: ClientEncryption;
  let keyVault: KeyVault;
  let clientEncryptionSpy;
  describe('Metadata', function () {
    before(function () {
      libmongoc = stubInterface<FLEClientEncryption>();
      sp = stubInterface<ServiceProvider>();
      sp.bsonLibrary = bson;
      sp.fle = {
        ClientEncryption: function () {
          return libmongoc;
        },
      } as any;
      sp.initialDb = 'test';
      instanceState = new ShellInstanceState(sp, stubInterface<EventEmitter>());
      instanceState.currentDb = stubInterface<Database>();
      mongo = new Mongo(
        instanceState,
        'localhost:27017',
        AWS_KMS,
        undefined,
        sp
      );
      clientEncryption = new ClientEncryption(mongo);
      keyVault = new KeyVault(clientEncryption);
    });
    it('calls help function', async function () {
      expect((await toShellResult(clientEncryption.help())).type).to.equal(
        'Help'
      );
      expect((await toShellResult(clientEncryption.help)).type).to.equal(
        'Help'
      );
      expect((await toShellResult(keyVault.help())).type).to.equal('Help');
      expect((await toShellResult(keyVault.help)).type).to.equal('Help');
    });
    it('calls print function', async function () {
      expect((await toShellResult(clientEncryption)).printable).to.equal(
        'ClientEncryption class for mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
      expect((await toShellResult(keyVault)).printable).to.equal(
        'KeyVault class for mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
    it('has metadata type', async function () {
      expect((await toShellResult(clientEncryption)).type).to.equal(
        'ClientEncryption'
      );
      expect((await toShellResult(keyVault)).type).to.equal('KeyVault');
    });
  });
  describe('signatures', function () {
    it('type', function () {
      expect(signatures.KeyVault.type).to.equal('KeyVault');
      expect(signatures.ClientEncryption.type).to.equal('ClientEncryption');
    });
    it('attributes', function () {
      expect(signatures.KeyVault.attributes.createKey).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { attributes: {}, type: 'unknown' },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: [1, Infinity],
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
      expect(signatures.ClientEncryption.attributes.encrypt).to.deep.equal({
        type: 'function',
        returnsPromise: true,
        deprecated: false,
        returnType: { attributes: {}, type: 'unknown' },
        platforms: ALL_PLATFORMS,
        topologies: ALL_TOPOLOGIES,
        apiVersions: ALL_API_VERSIONS,
        serverVersions: ALL_SERVER_VERSIONS,
        isDirectShellCommand: false,
        acceptsRawInput: false,
        shellCommandCompleter: undefined,
      });
    });
  });
  describe('commands', function () {
    beforeEach(function () {
      clientEncryptionSpy = sinon.spy();
      libmongoc = stubInterface<FLEClientEncryption>();
      sp = stubInterface<ServiceProvider>();
      sp.getRawClient.returns(RAW_CLIENT);
      sp.bsonLibrary = bson;
      sp.fle = {
        ClientEncryption: function (...args) {
          clientEncryptionSpy(...args);
          return libmongoc;
        },
      } as any;
      sp.initialDb = 'test';
      instanceState = new ShellInstanceState(sp, stubInterface<EventEmitter>());
      instanceState.currentDb = stubInterface<Database>();
      mongo = new Mongo(
        instanceState,
        'localhost:27017',
        AWS_KMS,
        undefined,
        sp
      );
      clientEncryption = new ClientEncryption(mongo);
      keyVault = new KeyVault(clientEncryption);
    });
    describe('constructor', function () {
      it('constructs ClientEncryption with correct options', function () {
        expect(sp.getRawClient.getCalls().length).to.equal(1); // called for ClientEncryption construction
        expect(clientEncryptionSpy).to.have.been.calledOnceWithExactly(
          RAW_CLIENT,
          {
            keyVaultClient: undefined,
            keyVaultNamespace: AWS_KMS.keyVaultNamespace,
            kmsProviders: AWS_KMS.kmsProviders,
            bypassAutoEncryption: AWS_KMS.bypassAutoEncryption,
          }
        );
      });
    });
    describe('encrypt', function () {
      it('calls encrypt with algorithm on libmongoc', async function () {
        const value = new bson.ObjectId();
        libmongoc.encrypt.resolves();
        await clientEncryption.encrypt(KEY_ID, value, ALGO);
        expect(libmongoc.encrypt).calledOnceWithExactly(value, {
          keyId: KEY_ID,
          algorithm: ALGO,
        });
      });
      it('calls encrypt with algorithm, contentionFactor, and queryType on libmongoc', async function () {
        const value = new bson.ObjectId();
        libmongoc.encrypt.resolves();
        await clientEncryption.encrypt(KEY_ID, value, ENCRYPT_OPTIONS);
        expect(libmongoc.encrypt).calledOnceWithExactly(value, {
          keyId: KEY_ID,
          ...ENCRYPT_OPTIONS,
        });
      });
      it('throw if failed', async function () {
        const value = new bson.ObjectId();
        const expectedError = new Error();
        libmongoc.encrypt.rejects(expectedError);
        const caughtError = await clientEncryption
          .encrypt(KEY_ID, value, ALGO)
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('decrypt', function () {
      it('calls decrypt on libmongoc', async function () {
        const raw = 'decrypted';
        libmongoc.decrypt.resolves(raw);
        const result = await clientEncryption.decrypt(KEY_ID);
        expect(libmongoc.decrypt).calledOnceWithExactly(KEY_ID);
        expect(result).to.equal(raw);
      });
      it('throw if failed', async function () {
        const expectedError = new Error();
        libmongoc.decrypt.rejects(expectedError);
        const caughtError = await clientEncryption
          .decrypt(KEY_ID)
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('encryptExpression', function () {
      const expression = {
        $and: [{ someField: { $gt: 1 } }],
      };

      const options = {
        algorithm: 'RangePreview',
        queryType: 'rangePreview',
        contentionFactor: 0,
        rangeOptions: {
          sparsity: new bson.Long(1),
        },
      } as const;

      it('calls encryptExpression with algorithm on libmongoc', async function () {
        libmongoc.encryptExpression.resolves();
        await clientEncryption.encryptExpression(KEY_ID, expression, options);
        expect(libmongoc.encryptExpression).calledOnceWithExactly(expression, {
          keyId: KEY_ID,
          ...options,
        });
      });
      it('calls encryptExpression with algorithm, contentionFactor, and queryType on libmongoc', async function () {
        const expression = {
          $and: [{ someField: { $gt: 1 } }],
        };
        libmongoc.encryptExpression.resolves();
        await clientEncryption.encryptExpression(KEY_ID, expression, options);
        expect(libmongoc.encryptExpression).calledOnceWithExactly(expression, {
          keyId: KEY_ID,
          ...options,
        });
      });
      it('throw if failed', async function () {
        const expectedError = new Error();
        libmongoc.encryptExpression.rejects(expectedError);
        const caughtError = await clientEncryption
          .encryptExpression(KEY_ID, expression, options)
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
    });
    describe('createKey', function () {
      it('calls createDataKey on libmongoc with no key for local', async function () {
        const raw = { result: 1 };
        const kms = 'local';
        libmongoc.createDataKey.resolves(raw);
        const result = await keyVault.createKey('local');
        expect(libmongoc.createDataKey).calledOnceWithExactly(kms, undefined);
        expect(result).to.deep.equal(raw);
      });
      it('calls createDataKey on libmongoc with doc key', async function () {
        const raw = { result: 1 };
        const masterKey = { region: 'us-east-1', key: 'masterkey' };
        const keyAltNames = ['keyaltname'];
        libmongoc.createDataKey.resolves(raw);
        const result = await keyVault.createKey('aws', masterKey, keyAltNames);
        expect(libmongoc.createDataKey).calledOnceWithExactly('aws', {
          masterKey,
          keyAltNames,
        });
        expect(result).to.deep.equal(raw);
      });
      it('throw if failed', async function () {
        const masterKey = { region: 'us-east-1', key: 'masterkey' };
        const keyAltNames = ['keyaltname'];
        const expectedError = new Error();
        libmongoc.createDataKey.rejects(expectedError);
        const caughtError = await keyVault
          .createKey('aws', masterKey, keyAltNames)
          .catch((e) => e);
        expect(caughtError).to.equal(expectedError);
      });
      it('supports the old local-masterKey combination', async function () {
        const raw = { result: 1 };
        const kms = 'local';
        libmongoc.createDataKey.resolves(raw);
        const result = await keyVault.createKey('local', '');
        expect(libmongoc.createDataKey).calledOnceWithExactly(kms, undefined);
        expect(result).to.deep.equal(raw);
      });
      it('supports the old local-keyAltNames combination', async function () {
        const raw = { result: 1 };
        const kms = 'local';
        const keyAltNames = ['keyaltname'];
        libmongoc.createDataKey.resolves(raw);
        const result = await keyVault.createKey('local', keyAltNames);
        expect(libmongoc.createDataKey).calledOnceWithExactly(kms, {
          keyAltNames,
        });
        expect(result).to.deep.equal(raw);
      });
      it('supports the old local-masterKey-keyAltNames combination', async function () {
        const raw = { result: 1 };
        const kms = 'local';
        const keyAltNames = ['keyaltname'];
        libmongoc.createDataKey.resolves(raw);
        const result = await keyVault.createKey('local', '', keyAltNames);
        expect(libmongoc.createDataKey).calledOnceWithExactly(kms, {
          keyAltNames,
        });
        expect(result).to.deep.equal(raw);
      });
      it('throws if alt names are given as second arg for non-local', async function () {
        const raw = { result: 1 };
        libmongoc.createDataKey.resolves(raw);
        try {
          await keyVault.createKey('aws' as any, ['altkey']);
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain(
            'requires masterKey to be given as second argument'
          );
          return;
        }
        expect.fail('Expected error');
      });
      it('throws if array is given twice', async function () {
        const raw = { result: 1 };
        libmongoc.createDataKey.resolves(raw);
        try {
          await keyVault.createKey('local', ['altkey'] as any, ['altkeyx']);
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain(
            'array for the masterKey and keyAltNames'
          );
          return;
        }
        expect.fail('Expected error');
      });
      it('throws if old AWS style key is created', async function () {
        const raw = { result: 1 };
        libmongoc.createDataKey.resolves(raw);
        try {
          await keyVault.createKey('aws', 'oldstyle');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain('For AWS please use createKey');
          return;
        }
        expect.fail('Expected error');
      });
      it('throws if old AWS style key is created with altNames', async function () {
        const raw = { result: 1 };
        libmongoc.createDataKey.resolves(raw);
        try {
          await keyVault.createKey('aws', 'oldstyle', ['altname']);
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.message).to.contain('For AWS please use createKey');
          return;
        }
        expect.fail('Expected error');
      });
      it('reads keyAltNames and keyMaterial from DataKeyEncryptionKeyOptions', async function () {
        const rawResult = { result: 1 };
        const keyVault = await mongo.getKeyVault();
        const options = {
          keyAltNames: ['b'],
          keyMaterial: new bson.Binary(
            Buffer.from('12345678123498761234123456789012', 'hex'),
            4
          ),
        };

        libmongoc.createDataKey.resolves(rawResult);
        await keyVault.createKey('local', options);
        expect(libmongoc.createDataKey).calledOnceWithExactly('local', options);
      });
    });
    describe('getKey', function () {
      it('calls find on key coll', async function () {
        const c = {
          next() {
            return { _id: 1 };
          },
          limit() {},
        } as any;
        sp.find.returns(c);
        const result = await keyVault.getKey(KEY_ID);
        expect(sp.find).to.have.been.calledTwice;
        expect(sp.find).to.have.been.calledWith(DB, COLL, { _id: KEY_ID }, {});
        expect(result._cursor).to.deep.equal(c);
        expect(result._id).to.equal(1);
        expect(await result.next()).to.deep.equal({ _id: 1 });
      });
      it('avoids running .find() twice if the cursor supports rewinding', async function () {
        const c = {
          next() {
            return { _id: 1 };
          },
          limit() {},
          rewind: sinon.stub(),
        } as any;
        sp.find.returns(c);
        const result = await keyVault.getKey(KEY_ID);
        expect(sp.find).to.have.been.calledOnceWithExactly(
          DB,
          COLL,
          { _id: KEY_ID },
          {}
        );
        expect(c.rewind).to.have.been.calledOnceWithExactly();
        expect(result._cursor).to.deep.equal(c);
        expect(result._id).to.equal(1);
        expect(await result.next()).to.deep.equal({ _id: 1 });
      });
      it('works when no result is returned', async function () {
        const c = {
          next() {
            return null;
          },
          limit() {},
        } as any;
        sp.find.returns(c);
        const result = await keyVault.getKey(KEY_ID);
        expect(sp.find).to.have.been.calledTwice;
        expect(sp.find).to.have.been.calledWith(DB, COLL, { _id: KEY_ID }, {});
        expect(result._cursor).to.deep.equal(c);
        expect(result._id).to.equal(undefined);
        expect(inspect(result)).to.include(
          'no result -- will return `null` in future mongosh versions'
        );
        expect(await result.next()).to.deep.equal(null);
      });
    });
    describe('getKeyByAltName', function () {
      it('calls find on key coll', async function () {
        const c = {
          next() {
            return { _id: 1 };
          },
          limit() {},
        } as any;
        const keyaltname = 'abc';
        sp.find.returns(c);
        const result = await keyVault.getKeyByAltName(keyaltname);
        expect(sp.find).to.have.been.calledTwice;
        expect(sp.find).to.have.been.calledWith(
          DB,
          COLL,
          { keyAltNames: keyaltname },
          {}
        );
        expect(result._cursor).to.deep.equal(c);
        expect(result._id).to.equal(1);
        expect(await result.next()).to.deep.equal({ _id: 1 });
      });
    });
    describe('getKeys', function () {
      it('calls getKeys on libmongocrypt', async function () {
        const c = { count: 1 } as any;
        libmongoc.getKeys.returns(c);
        const result = await keyVault.getKeys();
        expect(libmongoc.getKeys).to.have.been.called;
        expect(result._cursor).to.deep.equal(c);
      });
    });
    describe('deleteKey', function () {
      it('calls deleteKey on libmongocrypt', async function () {
        const r = { acknowledged: true, deletedCount: 1 } as any;
        libmongoc.deleteKey.resolves(r);
        const result = await keyVault.deleteKey(KEY_ID);
        expect(libmongoc.deleteKey).to.have.been.calledOnceWithExactly(KEY_ID);
        expect(result).to.deep.eq(r);
      });
    });
    describe('addKeyAlternateName', function () {
      it('calls addKeyAltName on libmongocrypt', async function () {
        const r = { value: { ok: 1 } } as any;
        libmongoc.addKeyAltName.resolves(r.value);
        const result = await keyVault.addKeyAlternateName(KEY_ID, 'altname');
        expect(libmongoc.addKeyAltName).to.have.been.calledOnceWithExactly(
          KEY_ID,
          'altname'
        );
        expect(result).to.deep.equal(r.value);
      });
    });
    describe('removeKeyAlternateName', function () {
      it('calls removeKeyAltName on libmongocrypt', async function () {
        const r = { value: { ok: 1 } } as any;
        libmongoc.removeKeyAltName.resolves(r.value);
        const result = await keyVault.removeKeyAlternateName(KEY_ID, 'altname');
        expect(libmongoc.removeKeyAltName).to.have.been.calledOnceWithExactly(
          KEY_ID,
          'altname'
        );
        expect(result).to.deep.equal(r.value);
      });
    });
    describe('rewrapManyDataKey', function () {
      it('calls rewrapManyDataKey on clientEncryption', async function () {
        const rawResult = { result: 1 } as any;
        libmongoc.rewrapManyDataKey.resolves(rawResult);
        const result = await keyVault.rewrapManyDataKey(
          { status: 0 },
          { provider: 'local' }
        );
        expect(libmongoc.rewrapManyDataKey).calledOnceWithExactly(
          { status: 0 },
          { provider: 'local' }
        );
        expect(result).to.deep.equal(rawResult);
      });
    });
    describe('createEncryptedCollection', function () {
      const dbName = 'secretDB';
      const collName = 'secretColl';
      const createCollectionOptions = {
        provider: 'local' as ClientEncryptionDataKeyProvider,
        createCollectionOptions: {
          encryptedFields: {
            fields: [
              {
                path: 'secretField',
                bsonType: 'string',
              },
            ],
          },
        },
      };

      beforeEach(function () {
        sp.createEncryptedCollection = sinon.stub();
        sp.createEncryptedCollection.resolves({
          collection: {} as any,
          encryptedFields: [
            {
              path: 'secretField',
              bsonType: 'string',
              keyId: 'random-uuid-string',
            },
          ],
        });
      });

      it('calls createEncryptedCollection on service provider', async function () {
        await clientEncryption.createEncryptedCollection(
          dbName,
          collName,
          createCollectionOptions
        );
        expect(sp.createEncryptedCollection).calledOnceWithExactly(
          dbName,
          collName,
          createCollectionOptions,
          libmongoc
        );
      });

      it('returns the created collection and a list of encrypted fields', async function () {
        const libmongocResponse = {
          collection: {} as any,
          encryptedFields: [
            {
              path: 'secretField',
              bsonType: 'string',
              keyId: 'random-uuid-string',
            },
          ],
        };
        const { collection, encryptedFields } =
          await clientEncryption.createEncryptedCollection(
            dbName,
            collName,
            createCollectionOptions
          );
        expect(collection).to.be.instanceOf(Collection);
        expect(encryptedFields).to.deep.equal(
          libmongocResponse.encryptedFields
        );
      });
    });
  });
  describe('Mongo constructor FLE options', function () {
    before(function () {
      libmongoc = stubInterface<FLEClientEncryption>();
      sp = stubInterface<ServiceProvider>();
      sp.bsonLibrary = bson;
      sp.fle = {
        ClientEncryption: function () {
          return libmongoc;
        },
      } as any;
      sp.initialDb = 'test';
      instanceState = new ShellInstanceState(sp, stubInterface<EventEmitter>());
      instanceState.currentDb = stubInterface<Database>();
    });
    it('accepts the same local key twice', function () {
      const localKmsOptions: ClientSideFieldLevelEncryptionOptions = {
        keyVaultNamespace: `${DB}.${COLL}`,
        kmsProviders: {
          local: {
            key: new bson.Binary(Buffer.alloc(96).toString('base64')),
          },
        },
        schemaMap: SCHEMA_MAP,
        bypassAutoEncryption: true,
      };
      new Mongo(
        instanceState,
        'localhost:27017',
        localKmsOptions,
        undefined,
        sp
      );
      new Mongo(
        instanceState,
        'localhost:27017',
        localKmsOptions,
        undefined,
        sp
      );
    });
    it('allows getting ClientEncryption if a schema map is provided', async function () {
      const localKmsOptions: ClientSideFieldLevelEncryptionOptions = {
        keyVaultNamespace: `${DB}.${COLL}`,
        kmsProviders: {
          local: {
            key: new bson.Binary(Buffer.alloc(96).toString('base64')),
          },
        },
        schemaMap: SCHEMA_MAP,
        encryptedFieldsMap: SCHEMA_MAP,
        bypassAutoEncryption: true,
      };
      const mongo = new Mongo(
        instanceState,
        'localhost:27017',
        localKmsOptions,
        undefined,
        sp
      );
      expect(mongo.getClientEncryption()).to.be.instanceOf(ClientEncryption);
      expect(await mongo.getKeyVault()).to.be.instanceOf(KeyVault);
    });
    it('fails if both explicitEncryptionOnly and schemaMap are passed', function () {
      const localKmsOptions: ClientSideFieldLevelEncryptionOptions = {
        keyVaultNamespace: `${DB}.${COLL}`,
        kmsProviders: {
          local: {
            key: new bson.Binary(Buffer.alloc(96).toString('base64')),
          },
        },
        schemaMap: SCHEMA_MAP,
        explicitEncryptionOnly: true,
      };
      try {
        void new Mongo(
          instanceState,
          'localhost:27017',
          localKmsOptions,
          undefined,
          sp
        );
      } catch (e: any) {
        return expect(e.message).to.contain(
          'explicitEncryptionOnly and schemaMap are mutually exclusive'
        );
      }
      expect.fail('Expected error');
    });
  });
  describe('KeyVault constructor', function () {
    beforeEach(function () {
      libmongoc = stubInterface<FLEClientEncryption>();
      sp = stubInterface<ServiceProvider>();
      sp.getRawClient.returns(RAW_CLIENT);
      sp.bsonLibrary = bson;
      sp.fle = {
        ClientEncryption: function () {
          return libmongoc;
        },
      } as any;
      sp.initialDb = 'test';
      instanceState = new ShellInstanceState(sp, stubInterface<EventEmitter>());
      instanceState.currentDb = stubInterface<Database>();
    });
    it('fails to construct when FLE options are missing on Mongo', function () {
      mongo = new Mongo(
        instanceState,
        'localhost:27017',
        undefined,
        undefined,
        sp
      );
      clientEncryption = new ClientEncryption(mongo);
      try {
        void new KeyVault(clientEncryption);
      } catch (e: any) {
        return expect(e.message).to.contain(
          'FLE options must be passed to the Mongo object'
        );
      }
      expect.fail('Expected error');
    });
    it('fails to construct when the keyVaultNamespace option is invalid', function () {
      mongo = new Mongo(
        instanceState,
        'localhost:27017',
        {
          keyVaultNamespace: 'asdf',
          kmsProviders: {},
        },
        undefined,
        sp
      );
      clientEncryption = new ClientEncryption(mongo);
      try {
        void new KeyVault(clientEncryption);
      } catch (e: any) {
        return expect(e.message).to.contain("Invalid keyVaultNamespace 'asdf'");
      }
      expect.fail('Expected error');
    });
  });

  describe('integration', function () {
    const testServer = startTestServer('shared');
    let dbname: string;
    let uri: string;
    let serviceProvider;
    let instanceState;
    let connections: any[];
    let printedOutput: any[];

    beforeEach(async function () {
      dbname = `test_fle_${Date.now()}`;
      uri = await testServer.connectionString();
      serviceProvider = await CliServiceProvider.connect(
        uri,
        dummyOptions,
        {},
        new EventEmitter()
      );
      instanceState = new ShellInstanceState(serviceProvider);
      instanceState.setEvaluationListener({
        onPrint: (value: any[]) => printedOutput.push(...value),
      });
      printedOutput = [];

      connections = [];
      sinon.replace(
        require('tls'),
        'connect',
        sinon.fake((options, onConnect) => {
          if (options.host === 'kmip.example.com') {
            // KMIP is not http(s)-based, we don't implement strong fakes for it
            // and instead only verify that a connection has occurred.
            connections.push({ options });
            process.nextTick(onConnect);
            const conn = new Duplex({
              read() {
                setImmediate(() =>
                  this.destroy(new Error('mock connection broken'))
                );
              },
              write(chunk, enc, cb) {
                cb();
              },
            });
            return conn;
          }
          if (
            !fakeAWSHandlers.some((handler) => handler.host.test(options.host))
          ) {
            throw new Error(`Unexpected TLS connection to ${options.host}`);
          }
          process.nextTick(onConnect);
          const conn = makeFakeHTTPConnection(fakeAWSHandlers);
          connections.push(conn);
          return conn;
        })
      );
    });

    afterEach(async function () {
      await serviceProvider.dropDatabase(dbname);
      await instanceState.close(true);
      sinon.restore();
    });

    const kms: [
      keyof KMSProvider,
      KMSProvider[keyof KMSProvider] & {
        tlsOptions?: ClientEncryptionTlsOptions;
      }
    ][] = [
      [
        'local',
        {
          key: new bson.Binary(
            Buffer.from(
              'kh4Gv2N8qopZQMQYMEtww/AkPsIrXNmEMxTrs3tUoTQZbZu4msdRUaR8U5fXD7A7QXYHcEvuu4WctJLoT+NvvV3eeIg3MD+K8H9SR794m/safgRHdIfy6PD+rFpvmFbY',
              'base64'
            ),
            0
          ),
        },
      ],
      [
        'aws',
        {
          accessKeyId: 'SxHpYMUtB1CEVg9tX0N1',
          secretAccessKey: '44mjXTk34uMUmORma3w1viIAx4RCUv78bzwDY0R7',
        },
      ],
      [
        'aws',
        {
          accessKeyId: 'SxHpYMUtB1CEVg9tX0N1',
          secretAccessKey: '44mjXTk34uMUmORma3w1viIAx4RCUv78bzwDY0R7',
          sessionToken: 'WXWHMnniSqij0CH27KK7H',
        },
      ],
      [
        'azure',
        {
          tenantId: 'MUtB1CEVg9tX0',
          clientId: 'SxHpYMUtB1CEVg9tX0N1',
          clientSecret: '44mjXTk34uMUmORma3w1viIAx4RCUv78bzwDY0R7',
        },
      ],
      [
        'gcp',
        {
          email: 'somebody@google.com',
          // Taken from the PKCS 8 Wikipedia page.
          privateKey: `\
MIIBVgIBADANBgkqhkiG9w0BAQEFAASCAUAwggE8AgEAAkEAq7BFUpkGp3+LQmlQ
Yx2eqzDV+xeG8kx/sQFV18S5JhzGeIJNA72wSeukEPojtqUyX2J0CciPBh7eqclQ
2zpAswIDAQABAkAgisq4+zRdrzkwH1ITV1vpytnkO/NiHcnePQiOW0VUybPyHoGM
/jf75C5xET7ZQpBe5kx5VHsPZj0CBb3b+wSRAiEA2mPWCBytosIU/ODRfq6EiV04
lt6waE7I2uSPqIC20LcCIQDJQYIHQII+3YaPqyhGgqMexuuuGx+lDKD6/Fu/JwPb
5QIhAKthiYcYKlL9h8bjDsQhZDUACPasjzdsDEdq8inDyLOFAiEAmCr/tZwA3qeA
ZoBzI10DGPIuoKXBd3nk/eBxPkaxlEECIQCNymjsoI7GldtujVnr1qT+3yedLfHK
srDVjIT3LsvTqw==`,
        },
      ],
      [
        'kmip',
        {
          endpoint: 'kmip.example.com:123',
          tlsOptions: {
            tlsCertificateKeyFile: getCertPath('client.bundle.encrypted.pem'),
            tlsCertificateKeyFilePassword: 'p4ssw0rd',
            tlsCAFile: getCertPath('ca.crt'),
          },
        },
      ],
    ];
    for (const [kmsName, kmsAndTlsOptions] of kms) {
      it(`provides ClientEncryption for kms=${kmsName}`, async function () {
        const kmsOptions = { ...kmsAndTlsOptions, tlsOptions: undefined };
        const mongo = new Mongo(
          instanceState,
          uri,
          {
            keyVaultNamespace: `${dbname}.__keyVault`,
            kmsProviders: { [kmsName]: kmsOptions } as any,
            explicitEncryptionOnly: true,
            tlsOptions: { [kmsName]: kmsAndTlsOptions.tlsOptions ?? undefined },
          },
          serviceProvider
        );
        await mongo.connect();
        instanceState.mongos.push(mongo);

        const keyVault = await mongo.getKeyVault();
        expect(
          await mongo.getDB(dbname).getCollection('__keyVault').getIndexKeys()
        ).to.deep.equal([{ _id: 1 }, { keyAltNames: 1 }]);

        let keyId;
        switch (kmsName) {
          case 'local':
            keyId = await keyVault.createKey('local');
            break;
          case 'aws':
            keyId = await keyVault.createKey('aws', {
              region: 'us-east-2',
              key: 'arn:aws:kms:us-east-2:398471984214:key/174b7c1d-3651-4517-7521-21988befd8cb',
            });
            break;
          case 'azure':
            keyId = await keyVault.createKey('azure', {
              keyName: 'asdfghji',
              keyVaultEndpoint: 'test.vault.azure.net',
            });
            break;
          case 'gcp':
            keyId = await keyVault.createKey('gcp', {
              projectId: 'foo',
              location: 'global',
              keyRing: 'bar',
              keyName: 'foobar',
            });
            break;
          case 'kmip':
            try {
              await keyVault.createKey('kmip', undefined);
            } catch (err: any) {
              // See above, we don't attempt to successfully encrypt/decrypt
              // when using KMIP
              expect(err.message).to.include('KMS request failed');
              expect(connections).to.deep.equal([
                {
                  options: {
                    host: 'kmip.example.com',
                    servername: 'kmip.example.com',
                    port: 123,
                    passphrase: 'p4ssw0rd',
                    ca: await fs.readFile(getCertPath('ca.crt')),
                    cert: await fs.readFile(
                      getCertPath('client.bundle.encrypted.pem')
                    ),
                    key: await fs.readFile(
                      getCertPath('client.bundle.encrypted.pem')
                    ),
                  },
                },
              ]);
              return;
            }
            expect.fail('missed exception');
            break;
          default:
            throw new Error(`unreachable ${kmsName}`);
        }

        const plaintextValue = { someValue: 'foo' };

        const clientEncryption = mongo.getClientEncryption();
        const encrypted = await clientEncryption.encrypt(
          keyId,
          plaintextValue,
          'AEAD_AES_256_CBC_HMAC_SHA_512-Random'
        );
        const decrypted = await clientEncryption.decrypt(encrypted);

        expect(keyId.sub_type).to.equal(4); // UUID
        expect(encrypted.sub_type).to.equal(6); // Encrypted
        expect(decrypted).to.deep.equal(plaintextValue);

        if ('sessionToken' in kmsOptions) {
          expect(
            connections
              .map((conn) =>
                conn.requests.map((req) => req.headers['x-amz-security-token'])
              )
              .flat()
          ).to.include(kmsOptions.sessionToken);
        }

        expect(printedOutput).to.deep.equal([]);
      });
    }

    it('does not add duplicate keyAltNames when addKeyAlternateName is called twice', async function () {
      const mongo = new Mongo(
        instanceState,
        uri,
        {
          keyVaultNamespace: `${dbname}.__keyVault`,
          kmsProviders: { local: { key: 'A'.repeat(128) } },
          explicitEncryptionOnly: true,
        },
        serviceProvider
      );
      await mongo.connect();
      instanceState.mongos.push(mongo);
      const kv = mongo.getDB(dbname).getCollection('__keyVault');

      const keyVault = await mongo.getKeyVault();
      const uuid = await keyVault.createKey('local', ['b']);
      await keyVault.addKeyAlternateName(uuid, 'a');
      await keyVault.addKeyAlternateName(uuid, 'a');

      expect(
        (await kv.findOne({}, { keyAltNames: 1, _id: 0 })).keyAltNames.sort()
      ).to.deep.equal(['a', 'b']);

      expect(printedOutput).to.deep.equal([]);
    });

    it('removes empty keyAltNames arrays from keyVault before initializing index', async function () {
      const mongo = new Mongo(
        instanceState,
        uri,
        {
          keyVaultNamespace: `${dbname}.__keyVault`,
          kmsProviders: { local: { key: 'A'.repeat(128) } },
          explicitEncryptionOnly: true,
        },
        serviceProvider
      );
      await mongo.connect();
      instanceState.mongos.push(mongo);
      const kv = mongo.getDB(dbname).getCollection('__keyVault');

      await kv.insertMany([
        { keyAltNames: [] },
        { keyAltNames: [] },
        { keyAltNames: ['a'] },
      ]);

      await mongo.getKeyVault();

      expect(
        await (await kv.find({}, { keyAltNames: 1, _id: 0 })).toArray()
      ).to.deep.equal([{}, {}, { keyAltNames: ['a'] }]);
      expect(await kv.getIndexKeys()).to.deep.equal([
        { _id: 1 },
        { keyAltNames: 1 },
      ]);

      expect(printedOutput).to.deep.equal([]);
    });

    it('prints a warning when creating the keyAltNames index fails', async function () {
      const mongo = new Mongo(
        instanceState,
        uri,
        {
          keyVaultNamespace: `${dbname}.__keyVault`,
          kmsProviders: { local: { key: 'A'.repeat(128) } },
          explicitEncryptionOnly: true,
        },
        serviceProvider
      );
      await mongo.connect();
      instanceState.mongos.push(mongo);

      // Make building a unique index over keyAltNames fail by starting out with duplicate values
      await mongo
        .getDB(dbname)
        .getCollection('__keyVault')
        .insertMany([{ keyAltNames: ['a'] }, { keyAltNames: ['a'] }]);

      await mongo.getKeyVault();
      expect(printedOutput).to.have.lengthOf(1);
      expect(printedOutput[0].printable).to.match(
        new RegExp(
          String.raw`^Warning: Creating 'keyAltNames' index on '${dbname}\.__keyVault' failed:`
        )
      );
    });
  });
});
