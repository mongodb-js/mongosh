import {
  classPlatforms,
  returnsPromise,
  returnType,
  apiVersions,
  shellApiClassDefault,
  ShellApiWithMongoClass
} from './decorators';
import {
  ClientEncryption as MongoCryptClientEncryption,
  ClientEncryptionCreateDataKeyProviderOptions,
  ClientEncryptionDataKeyProvider,
  ClientEncryptionOptions,
  ClientEncryptionEncryptOptions,
  ClientEncryptionTlsOptions,
  KMSProviders,
  ReplPlatform,
  AWSEncryptionKeyOptions,
  AzureEncryptionKeyOptions,
  GCPEncryptionKeyOptions
} from '@mongosh/service-provider-core';
import type { Document, BinaryType } from '@mongosh/service-provider-core';
import Collection from './collection';
import Cursor from './cursor';
import { DeleteResult } from './result';
import { assertArgsDefinedType } from './helpers';
import { asPrintable } from './enums';
import { redactURICredentials } from '@mongosh/history';
import type Mongo from './mongo';
import { CommonErrors, MongoshInvalidInputError, MongoshRuntimeError } from '@mongosh/errors';

export type ClientSideFieldLevelEncryptionKmsProvider = Omit<KMSProviders, 'local'> & {
  local?: {
    key: Buffer | string | BinaryType;
  }
};

export interface ClientSideFieldLevelEncryptionOptions {
  keyVaultClient?: Mongo,
  keyVaultNamespace: string,
  kmsProviders: ClientSideFieldLevelEncryptionKmsProvider,
  schemaMap?: Document,
  bypassAutoEncryption?: boolean;
  explicitEncryptionOnly?: boolean;
  tlsOptions?: { [k in keyof ClientSideFieldLevelEncryptionKmsProvider]?: ClientEncryptionTlsOptions };
  encryptedFieldsMap?: Document;
  bypassQueryAnalysis?: boolean;
}

type MasterKey = AWSEncryptionKeyOptions | AzureEncryptionKeyOptions | GCPEncryptionKeyOptions | undefined;
type AltNames = string[] | undefined;

type DataKeyEncryptionKeyOptions = {
  masterKey?: MasterKey;
  keyAltNames?: AltNames;
  keyMaterial?: Buffer | BinaryType
};

type MasterKeyOrAltNamesOrDataKeyOptions = MasterKey | DataKeyEncryptionKeyOptions | AltNames | string | undefined;

const isDataKeyEncryptionKeyOptions = (options: MasterKeyOrAltNamesOrDataKeyOptions): options is DataKeyEncryptionKeyOptions => {
  return (
    !Array.isArray(options) &&
    typeof options === 'object' &&
    ('masterKey' in options || 'keyAltNames' in options || 'keyMaterial' in options)
  );
};

const isMasterKey = (options: MasterKeyOrAltNamesOrDataKeyOptions): options is MasterKey => {
  return (
    !Array.isArray(options) &&
    typeof options === 'object' &&
    !('masterKey' in options) &&
    !('keyAltNames' in options) &&
    !('masterKey' in options)
  );
};

@shellApiClassDefault
@classPlatforms([ ReplPlatform.CLI ] )
export class ClientEncryption extends ShellApiWithMongoClass {
  public _mongo: Mongo;
  public _libmongocrypt: MongoCryptClientEncryption;

  constructor(mongo: Mongo) {
    super();
    this._mongo = mongo;

    const fle = mongo._serviceProvider.fle;
    if (!fle) {
      throw new MongoshRuntimeError('FLE API is not available');
    }

    // ClientEncryption does not take a schemaMap and will fail if it receives one
    const fleOptions = { ...this._mongo._fleOptions };
    delete fleOptions.schemaMap;

    this._libmongocrypt = new fle.ClientEncryption(
      mongo._serviceProvider.getRawClient(),
      fleOptions as ClientEncryptionOptions
    );
  }

  [asPrintable](): string {
    return `ClientEncryption class for ${redactURICredentials(this._mongo._uri)}`;
  }

  @returnsPromise
  async encrypt(
    encryptionId: BinaryType,
    value: any,
    algorithmOrEncryptionOptions: ClientEncryptionEncryptOptions['algorithm'] | ClientEncryptionEncryptOptions
  ): Promise<BinaryType> {
    let encryptionOptions: ClientEncryptionEncryptOptions;
    if (typeof algorithmOrEncryptionOptions === 'object') {
      encryptionOptions = {
        keyId: encryptionId,
        ...algorithmOrEncryptionOptions
      };
    } else {
      encryptionOptions = {
        keyId: encryptionId,
        algorithm: algorithmOrEncryptionOptions
      };
    }
    assertArgsDefinedType([encryptionId, value, encryptionOptions], [true, true, true], 'ClientEncryption.encrypt');
    return await this._libmongocrypt.encrypt(
      value,
      encryptionOptions
    );
  }

  @returnsPromise
  async decrypt(
    encryptedValue: BinaryType
  ): Promise<any> {
    assertArgsDefinedType([encryptedValue], [true], 'ClientEncryption.decrypt');
    return await this._libmongocrypt.decrypt(encryptedValue);
  }
}

@shellApiClassDefault
@classPlatforms([ ReplPlatform.CLI ] )
export class KeyVault extends ShellApiWithMongoClass {
  public _mongo: Mongo;
  public _clientEncryption: ClientEncryption;
  private _keyColl: Collection;
  constructor(clientEncryption: ClientEncryption) {
    super();
    this._mongo = clientEncryption._mongo;
    this._clientEncryption = clientEncryption;
    const keyVaultNamespace = this._mongo?._fleOptions?.keyVaultNamespace;
    if (!keyVaultNamespace) {
      throw new MongoshInvalidInputError('FLE options must be passed to the Mongo object');
    }
    const parsedNamespace = keyVaultNamespace.match(/^(?<db>[^.]+)\.(?<coll>.+)$/)?.groups;
    if (!parsedNamespace) {
      throw new MongoshInvalidInputError(`Invalid keyVaultNamespace '${keyVaultNamespace}'`);
    }
    const { db, coll } = parsedNamespace;
    this._keyColl = this._mongo.getDB(db).getCollection(coll);
  }

  async _init(): Promise<void> {
    try {
      const existingIndexKeys = await this._keyColl.getIndexKeys();
      if (existingIndexKeys.some(key => key.keyAltNames)) {
        return; // keyAltNames index already exists
      }
    } catch {
      // Probably failed because the collection does not exist to begin with.
    }

    try {
      // Both the legacy shell and mongosh previously attempted to
      // remove empty keyAltNames arrays that resulted from calls to
      // removeKeyAlternateName, but did not do so properly.
      // mongosh also did not create the keyAltNames index as intended
      // in the past.
      // To avoid problems with creating the unique index, we remove
      // empty arrays here explicitly.
      await this._keyColl.updateMany(
        { 'keyAltNames': { $size: 0 } },
        { $unset: { 'keyAltNames': '' }, $currentDate: { 'updateDate': true } }
      );

      await this._keyColl.createIndex(
        { keyAltNames: 1 },
        { unique: true, partialFilterExpression: { keyAltNames: { $exists: true } } });
    } catch (err: any) {
      await this._instanceState.printWarning(`Creating 'keyAltNames' index on '${this._keyColl.getFullName()}' failed: ${err.message}`);
    }
  }

  [asPrintable](): string {
    return `KeyVault class for ${redactURICredentials(this._mongo._uri)}`;
  }

  createKey(kms: 'local', keyAltNames?: string[]): Promise<BinaryType>
  createKey(kms: ClientEncryptionDataKeyProvider, legacyMasterKey: string, keyAltNames?: string[]): Promise<BinaryType>
  createKey(kms: ClientEncryptionDataKeyProvider, options: MasterKey | DataKeyEncryptionKeyOptions | undefined): Promise<BinaryType>
  createKey(kms: ClientEncryptionDataKeyProvider, options: MasterKey | DataKeyEncryptionKeyOptions | undefined, keyAltNames: string[]): Promise<BinaryType>
  @returnsPromise
  @apiVersions([1])
  // eslint-disable-next-line complexity
  async createKey(
    kms: ClientEncryptionDataKeyProvider,
    masterKeyOrAltNamesOrDataKeyOptions?: MasterKeyOrAltNamesOrDataKeyOptions,
    legacyKeyAltNames?: string[]
  ): Promise<BinaryType> {
    let masterKey: MasterKey;
    let keyAltNames;
    let keyMaterial;

    if (isDataKeyEncryptionKeyOptions(masterKeyOrAltNamesOrDataKeyOptions)) {
      masterKey = masterKeyOrAltNamesOrDataKeyOptions?.masterKey;
      keyAltNames = masterKeyOrAltNamesOrDataKeyOptions?.keyAltNames;
      keyMaterial = masterKeyOrAltNamesOrDataKeyOptions?.keyMaterial;
    } else if (isMasterKey(masterKeyOrAltNamesOrDataKeyOptions)) {
      masterKey = masterKeyOrAltNamesOrDataKeyOptions;
    }

    if (legacyKeyAltNames) {
      keyAltNames = legacyKeyAltNames;
    }

    assertArgsDefinedType([kms], [true], 'KeyVault.createKey');

    if (typeof masterKeyOrAltNamesOrDataKeyOptions === 'string') {
      if (kms === 'local' && masterKeyOrAltNamesOrDataKeyOptions === '') {
        // allowed in the old shell - even enforced prior to 4.2.3
        // https://docs.mongodb.com/manual/reference/method/KeyVault.createKey/
        masterKey = undefined;
      } else {
        throw new MongoshInvalidInputError(
          'KeyVault.createKey does not support providing masterKey as string anymore. For AWS please use createKey("aws", { region: ..., key: ... })',
          CommonErrors.Deprecated
        );
      }
    } else if (Array.isArray(masterKeyOrAltNamesOrDataKeyOptions)) {
      // old signature - one could immediately provide an array of key alt names
      // not documented but visible in code: https://github.com/mongodb/mongo/blob/eb2b72cf9c0269f086223d499ac9be8a270d268c/src/mongo/shell/keyvault.js#L19
      if (kms !== 'local') {
        throw new MongoshInvalidInputError(
          'KeyVault.createKey requires masterKey to be given as second argument if KMS is not local',
          CommonErrors.InvalidArgument
        );
      } else {
        if (keyAltNames) {
          throw new MongoshInvalidInputError(
            'KeyVault.createKey was supplied with an array for the masterKey and keyAltNames - either specify keyAltNames as second argument or set undefined for masterKey',
            CommonErrors.InvalidArgument
          );
        }

        keyAltNames = masterKeyOrAltNamesOrDataKeyOptions;
        masterKey = undefined;
      }
    }

    let options: ClientEncryptionCreateDataKeyProviderOptions | undefined;
    if (masterKey) {
      options = { masterKey };
    }
    if (keyAltNames) {
      options = {
        ...(options ?? {}),
        keyAltNames
      };
    }
    if (keyMaterial) {
      options = {
        ...(options ?? {}),
        keyMaterial
      };
    }

    return await this._clientEncryption._libmongocrypt.createDataKey(kms, options as ClientEncryptionCreateDataKeyProviderOptions);
  }

  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKey(keyId: BinaryType): Promise<Cursor> {
    assertArgsDefinedType([keyId], [true], 'KeyVault.getKey');
    return this._keyColl.find({ '_id': keyId });
  }

  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKeyByAltName(keyAltName: string): Promise<Cursor> {
    assertArgsDefinedType([keyAltName], ['string'], 'KeyVault.getKeyByAltName');
    return this._keyColl.find({ 'keyAltNames': keyAltName });
  }

  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKeys(): Promise<Cursor> {
    return this._keyColl.find({});
  }

  @returnsPromise
  @apiVersions([1])
  async deleteKey(keyId: BinaryType): Promise<DeleteResult | Document> {
    assertArgsDefinedType([keyId], [true], 'KeyVault.deleteKey');
    return this._keyColl.deleteOne({ '_id': keyId });
  }

  @returnsPromise
  @apiVersions([1])
  async addKeyAlternateName(keyId: BinaryType, keyAltName: string): Promise<Document> {
    assertArgsDefinedType([keyId, keyAltName], [true, 'string'], 'KeyVault.addKeyAlternateName');
    return this._keyColl.findAndModify({
      query: { '_id': keyId },
      update: { $addToSet: { 'keyAltNames': keyAltName }, $currentDate: { 'updateDate': true } },
    });
  }

  @returnsPromise
  @apiVersions([1])
  async removeKeyAlternateName(keyId: BinaryType, keyAltName: string): Promise<Document> {
    assertArgsDefinedType([keyId, keyAltName], [true, 'string'], 'KeyVault.removeKeyAlternateName');
    const ret = await this._keyColl.findAndModify({
      query: { '_id': keyId },
      update: { $pull: { 'keyAltNames': keyAltName }, $currentDate: { 'updateDate': true } }
    });

    if (ret !== null && ret.keyAltNames !== undefined && ret.keyAltNames.length === 1 && ret.keyAltNames[0] === keyAltName) {
      // Remove the empty array to prevent duplicate key violations
      return this._keyColl.findAndModify({
        query: { '_id': keyId, 'keyAltNames': { $size: 0 } },
        update: { $unset: { 'keyAltNames': '' }, $currentDate: { 'updateDate': true } }
      });
    }
    return ret;
  }
}
