import {
  classPlatforms,
  returnsPromise,
  returnType,
  apiVersions,
  shellApiClassDefault,
  ShellApiWithMongoClass,
} from './decorators';
import type {
  ClientEncryption as MongoCryptClientEncryption,
  ClientEncryptionCreateDataKeyProviderOptions,
  ClientEncryptionDataKeyProvider,
  ClientEncryptionOptions,
  ClientEncryptionEncryptOptions,
  ClientEncryptionTlsOptions,
  KMSProviders,
  AWSEncryptionKeyOptions,
  AzureEncryptionKeyOptions,
  GCPEncryptionKeyOptions,
} from '@mongosh/service-provider-core';
import type { Document, BinaryType } from '@mongosh/service-provider-core';
import type { Collection } from './collection';
import Cursor from './cursor';
import type { DeleteResult } from './result';
import type { GenericServerSideSchema, StringKey } from './helpers';
import { assertArgsDefinedType, assertKeysDefined } from './helpers';
import { asPrintable } from './enums';
import { redactURICredentials } from '@mongosh/history';
import type Mongo from './mongo';
import {
  CommonErrors,
  MongoshInvalidInputError,
  MongoshRuntimeError,
} from '@mongosh/errors';
import type { CreateEncryptedCollectionOptions } from '@mongosh/service-provider-core';

export interface ClientSideFieldLevelEncryptionOptions<
  M extends GenericServerSideSchema = GenericServerSideSchema
> {
  keyVaultClient?: Mongo<M>;
  keyVaultNamespace: string;
  kmsProviders: KMSProviders;
  schemaMap?: Document;
  bypassAutoEncryption?: boolean;
  explicitEncryptionOnly?: boolean;
  tlsOptions?: {
    [k in keyof KMSProviders]?: ClientEncryptionTlsOptions;
  };
  encryptedFieldsMap?: Document;
  bypassQueryAnalysis?: boolean;
}

type MasterKey =
  | AWSEncryptionKeyOptions
  | AzureEncryptionKeyOptions
  | GCPEncryptionKeyOptions;
type AltNames = string[];

type DataKeyEncryptionKeyOptions = {
  masterKey?: MasterKey;
  keyAltNames?: AltNames;
  keyMaterial?: Buffer | BinaryType;
};

type MasterKeyOrAltNamesOrDataKeyOptions =
  | MasterKey
  | DataKeyEncryptionKeyOptions
  | AltNames
  | string;

const isDataKeyEncryptionKeyOptions = (
  options?: MasterKeyOrAltNamesOrDataKeyOptions
): options is DataKeyEncryptionKeyOptions => {
  return (
    !Array.isArray(options) &&
    typeof options === 'object' &&
    ('masterKey' in options ||
      'keyAltNames' in options ||
      'keyMaterial' in options)
  );
};

const isMasterKey = (
  options?: MasterKeyOrAltNamesOrDataKeyOptions
): options is MasterKey => {
  return (
    !Array.isArray(options) &&
    typeof options === 'object' &&
    !isDataKeyEncryptionKeyOptions(options)
  );
};

@shellApiClassDefault
@classPlatforms(['CLI'])
export class ClientEncryption<
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends ShellApiWithMongoClass<M> {
  public _mongo: Mongo<M>;
  public _libmongocrypt: MongoCryptClientEncryption;

  constructor(mongo: Mongo<M>) {
    super();
    this._mongo = mongo;

    // ClientEncryption does not take a schemaMap and will fail if it receives one
    const fleOptions = { ...this._mongo._fleOptions };
    delete fleOptions.schemaMap;
    delete fleOptions.encryptedFieldsMap;

    if (!mongo._serviceProvider.createClientEncryption) {
      throw new MongoshRuntimeError('FLE API is not available');
    }
    this._libmongocrypt = mongo._serviceProvider.createClientEncryption(
      fleOptions as ClientEncryptionOptions
    );
  }

  [asPrintable](): string {
    return `ClientEncryption class for ${redactURICredentials(
      this._mongo._uri
    )}`;
  }

  @returnsPromise
  async encrypt(
    keyId: BinaryType,
    value: any,
    algorithmOrEncryptionOptions:
      | ClientEncryptionEncryptOptions['algorithm']
      | ClientEncryptionEncryptOptions
  ): Promise<BinaryType> {
    let encryptionOptions: ClientEncryptionEncryptOptions;
    if (typeof algorithmOrEncryptionOptions === 'object') {
      encryptionOptions = {
        keyId,
        ...algorithmOrEncryptionOptions,
      };
    } else {
      encryptionOptions = {
        keyId,
        algorithm: algorithmOrEncryptionOptions,
      };
    }
    assertArgsDefinedType(
      [keyId, value, encryptionOptions],
      [true, true, true],
      'ClientEncryption.encrypt'
    );
    return await this._libmongocrypt.encrypt(value, encryptionOptions);
  }

  @returnsPromise
  async decrypt(encryptedValue: BinaryType): Promise<any> {
    assertArgsDefinedType([encryptedValue], [true], 'ClientEncryption.decrypt');
    return await this._libmongocrypt.decrypt(encryptedValue);
  }

  @returnsPromise
  async encryptExpression(
    keyId: BinaryType,
    value: Document,
    options: ClientEncryptionEncryptOptions
  ) {
    assertArgsDefinedType(
      [keyId, value, options],
      [true, true, true],
      'ClientEncryption.encryptExpression'
    );
    return await this._libmongocrypt.encryptExpression(value, {
      keyId,
      ...options,
    });
  }

  @returnsPromise
  @apiVersions([1])
  async createEncryptedCollection(
    dbName: string,
    collName: string,
    options: CreateEncryptedCollectionOptions
  ): Promise<{ collection: Collection<M>; encryptedFields: Document }> {
    assertArgsDefinedType(
      [dbName],
      ['string'],
      'ClientEncryption.createEncryptedCollection'
    );
    assertArgsDefinedType(
      [collName],
      ['string'],
      'ClientEncryption.createEncryptedCollection'
    );
    assertArgsDefinedType(
      [options],
      ['object'],
      'ClientEncryption.createEncryptedCollection'
    );
    assertKeysDefined(options, ['provider', 'createCollectionOptions']);

    if (!this._mongo._serviceProvider.createEncryptedCollection) {
      throw new MongoshRuntimeError(
        'Runtime does not support createEncryptedCollection yet'
      );
    }

    const { encryptedFields } =
      await this._mongo._serviceProvider.createEncryptedCollection(
        dbName,
        collName,
        options,
        this._libmongocrypt
      );

    return {
      collection: this._mongo
        .getDB(dbName as StringKey<M>)
        .getCollection(collName as StringKey<M[StringKey<M>]>) as any,
      encryptedFields,
    };
  }
}

@shellApiClassDefault
@classPlatforms(['CLI'])
export class KeyVault<
  M extends GenericServerSideSchema = GenericServerSideSchema
> extends ShellApiWithMongoClass<M> {
  public _mongo: Mongo<M>;
  public _clientEncryption: ClientEncryption<M>;
  // TODO: M, D, C, N
  private _keyColl: Collection<M>;
  constructor(clientEncryption: ClientEncryption<M>) {
    super();
    this._mongo = clientEncryption._mongo;
    this._clientEncryption = clientEncryption;
    const keyVaultNamespace = this._mongo?._fleOptions?.keyVaultNamespace;
    if (!keyVaultNamespace) {
      throw new MongoshInvalidInputError(
        'FLE options must be passed to the Mongo object'
      );
    }
    const parsedNamespace = keyVaultNamespace.match(
      /^(?<db>[^.]+)\.(?<coll>.+)$/
    )?.groups;
    if (!parsedNamespace) {
      throw new MongoshInvalidInputError(
        `Invalid keyVaultNamespace '${keyVaultNamespace}'`
      );
    }
    const { db, coll } = parsedNamespace;
    this._keyColl = this._mongo
      .getDB(db as StringKey<M>)
      .getCollection(coll as StringKey<M[StringKey<M>]>) as any;
  }

  async _init(): Promise<void> {
    try {
      const existingIndexKeys = await this._keyColl.getIndexKeys();
      if (existingIndexKeys.some((key) => key.keyAltNames)) {
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
        { keyAltNames: { $size: 0 } },
        { $unset: { keyAltNames: '' }, $currentDate: { updateDate: true } }
      );

      await this._keyColl.createIndex(
        { keyAltNames: 1 },
        {
          unique: true,
          partialFilterExpression: { keyAltNames: { $exists: true } },
        }
      );
    } catch (err: any) {
      await this._instanceState.printWarning(
        `Creating 'keyAltNames' index on '${this._keyColl.getFullName()}' failed: ${
          err.message
        }`
      );
    }
  }

  [asPrintable](): string {
    return `KeyVault class for ${redactURICredentials(this._mongo._uri)}`;
  }

  createKey(kms: 'local', keyAltNames?: string[]): Promise<BinaryType>;
  createKey(
    kms: ClientEncryptionDataKeyProvider,
    legacyMasterKey: string,
    keyAltNames?: string[]
  ): Promise<BinaryType>;
  createKey(
    kms: ClientEncryptionDataKeyProvider,
    options: MasterKey | DataKeyEncryptionKeyOptions | undefined
  ): Promise<BinaryType>;
  createKey(
    kms: ClientEncryptionDataKeyProvider,
    options: MasterKey | DataKeyEncryptionKeyOptions | undefined,
    keyAltNames: string[]
  ): Promise<BinaryType>;
  @returnsPromise
  @apiVersions([1])
  async createKey(
    kms: ClientEncryptionDataKeyProvider,
    masterKeyOrAltNamesOrDataKeyOptions?: MasterKeyOrAltNamesOrDataKeyOptions,
    legacyKeyAltNames?: string[]
  ): Promise<BinaryType> {
    let masterKey: MasterKey | undefined;
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
        // https://mongodb.com/docs/manual/reference/method/KeyVault.createKey/
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
      options = { ...(options ?? {}), masterKey };
    }
    if (keyAltNames) {
      options = { ...(options ?? {}), keyAltNames };
    }
    if (keyMaterial) {
      options = { ...(options ?? {}), keyMaterial };
    }

    return await this._clientEncryption._libmongocrypt.createDataKey(
      kms,
      options as ClientEncryptionCreateDataKeyProviderOptions
    );
  }

  @apiVersions([1])
  @returnsPromise
  async getKey(keyId: BinaryType): Promise<Document | null> {
    assertArgsDefinedType([keyId], [true], 'KeyVault.getKey');
    const cursor = await this._keyColl.find({ _id: keyId } as any);
    return await cursor.limit(1).next();
  }

  @apiVersions([1])
  @returnsPromise
  async getKeyByAltName(keyAltName: string): Promise<Document | null> {
    assertArgsDefinedType([keyAltName], ['string'], 'KeyVault.getKeyByAltName');
    const cursor = await this._keyColl.find({ keyAltNames: keyAltName } as any);
    return await cursor.limit(1).next();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKeys(): Promise<Cursor<M>> {
    return new Cursor<M>(
      this._mongo,
      this._clientEncryption._libmongocrypt.getKeys()
    );
  }

  @returnsPromise
  @apiVersions([1])
  async deleteKey(keyId: BinaryType): Promise<DeleteResult | Document> {
    assertArgsDefinedType([keyId], [true], 'KeyVault.deleteKey');
    return await this._clientEncryption._libmongocrypt.deleteKey(keyId);
  }

  @returnsPromise
  @apiVersions([1])
  async addKeyAlternateName(
    keyId: BinaryType,
    keyAltName: string
  ): Promise<Document | null> {
    assertArgsDefinedType(
      [keyId, keyAltName],
      [true, 'string'],
      'KeyVault.addKeyAlternateName'
    );
    return await this._clientEncryption._libmongocrypt.addKeyAltName(
      keyId,
      keyAltName
    );
  }

  @returnsPromise
  @apiVersions([1])
  async removeKeyAlternateName(
    keyId: BinaryType,
    keyAltName: string
  ): Promise<Document | null> {
    assertArgsDefinedType(
      [keyId, keyAltName],
      [true, 'string'],
      'KeyVault.removeKeyAlternateName'
    );
    return await this._clientEncryption._libmongocrypt.removeKeyAltName(
      keyId,
      keyAltName
    );
  }

  @returnsPromise
  @apiVersions([1])
  async rewrapManyDataKey(
    filter: Document,
    options?: Document
  ): Promise<Document> {
    return await this._clientEncryption._libmongocrypt.rewrapManyDataKey(
      filter,
      options as any
    );
  }

  // Alias for compatibility with the driver API.
  @returnsPromise
  @apiVersions([1])
  async createDataKey(
    ...args: Parameters<KeyVault['createKey']>
  ): ReturnType<KeyVault['createKey']> {
    return await this.createKey(...args);
  }

  // Alias for compatibility with the driver API.
  @returnsPromise
  @apiVersions([1])
  async removeKeyAltName(
    ...args: Parameters<KeyVault['removeKeyAlternateName']>
  ): ReturnType<KeyVault['removeKeyAlternateName']> {
    return await this.removeKeyAlternateName(...args);
  }

  // Alias for compatibility with the driver API.
  @returnsPromise
  @apiVersions([1])
  async addKeyAltName(
    ...args: Parameters<KeyVault['addKeyAlternateName']>
  ): ReturnType<KeyVault['addKeyAlternateName']> {
    return await this.addKeyAlternateName(...args);
  }
}
