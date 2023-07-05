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
import type Collection from './collection';
import Cursor from './cursor';
import type { DeleteResult } from './result';
import { assertArgsDefinedType, assertKeysDefined } from './helpers';
import { asPrintable, shellApiType } from './enums';
import { redactURICredentials } from '@mongosh/history';
import type Mongo from './mongo';
import {
  CommonErrors,
  MongoshInvalidInputError,
  MongoshRuntimeError,
} from '@mongosh/errors';
import type ShellInstanceState from './shell-instance-state';
import type { CreateEncryptedCollectionOptions } from '@mongosh/service-provider-core';

export type ClientSideFieldLevelEncryptionKmsProvider = Omit<
  KMSProviders,
  'local'
> & {
  local?: {
    key: Buffer | string | BinaryType;
  };
};

export interface ClientSideFieldLevelEncryptionOptions {
  keyVaultClient?: Mongo;
  keyVaultNamespace: string;
  kmsProviders: ClientSideFieldLevelEncryptionKmsProvider;
  schemaMap?: Document;
  bypassAutoEncryption?: boolean;
  explicitEncryptionOnly?: boolean;
  tlsOptions?: {
    [k in keyof ClientSideFieldLevelEncryptionKmsProvider]?: ClientEncryptionTlsOptions;
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

// The KeyVault.getKey() and KeyVault.getKeyByAltName() are special because:
// - the legacy shell and mongosh versions up to 1.5.4 return a *cursor* (that returns at most one document)
// - drivers implementing the key management API return a *document* (or null)
// The driver API design is the right choice here. While we are migrating to it, to keep
// backwards compatibility with previous mongosh versions, we return a Proxy object
// that returns the document but provides access to cursor methods, either by
// rewinding the cursor from which we retrieved the result document (if possible)
// or re-creating the cursor altogether.
// Unfortunately, we cannot return a Proxy for `null` in the no-result case, so
// we return a Proxy for a dummy object in that case.
const NO_RESULT_PLACEHOLDER_DOC = Object.freeze({
  // A bit hacky but probably as good as it gets.
  [Symbol('no result -- will return `null` in future mongosh versions')]: true,
});
async function makeSingleDocReturnValue(
  makeCursor: () => Promise<Cursor>,
  method: string,
  instanceState: ShellInstanceState
): Promise<Document> {
  let cursor = await makeCursor();
  let doc: Document | null = null;
  try {
    doc = await cursor.limit(1).next();
  } catch {
    /* ignore */
  } finally {
    if (typeof cursor._cursor.rewind === 'function') {
      cursor._cursor.rewind();
    } else {
      // Not all service providers provide a .rewind() function,
      // fall back to just re-creating the cursor.
      cursor = await makeCursor();
    }
  }

  const warn = () => {
    void instanceState.printDeprecationWarning(
      `${method} returns a single document and will stop providing cursor methods in future versions of mongosh.`
    );
  };
  return new Proxy(doc ?? NO_RESULT_PLACEHOLDER_DOC, {
    get(target, property, receiver) {
      if (property === shellApiType) {
        return 'Document';
      }
      if (property === asPrintable) {
        return;
      }
      if (property in target) {
        return Reflect.get(target, property, receiver);
      }
      if (typeof property !== 'symbol' && property in cursor) {
        warn();
      }
      return Reflect.get(cursor, property);
    },

    getOwnPropertyDescriptor(target, property) {
      if (property in target) {
        return Reflect.getOwnPropertyDescriptor(target, property);
      }
      if (typeof property !== 'symbol' && property in cursor) {
        warn();
      }
      return Reflect.getOwnPropertyDescriptor(cursor, property);
    },

    has(target, property) {
      return property in target || property in cursor;
    },
  });
}

@shellApiClassDefault
@classPlatforms(['CLI'])
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
    delete fleOptions.encryptedFieldsMap;

    this._libmongocrypt = new fle.ClientEncryption(
      mongo._serviceProvider.getRawClient(),
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
  ): Promise<{ collection: Collection; encryptedFields: Document }> {
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
      collection: this._mongo.getDB(dbName).getCollection(collName),
      encryptedFields,
    };
  }
}

@shellApiClassDefault
@classPlatforms(['CLI'])
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
    this._keyColl = this._mongo.getDB(db).getCollection(coll);
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

  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKey(keyId: BinaryType): Promise<Document> {
    assertArgsDefinedType([keyId], [true], 'KeyVault.getKey');
    return await makeSingleDocReturnValue(
      () => this._keyColl.find({ _id: keyId }),
      'KeyVault.getKey',
      this._instanceState
    );
  }

  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKeyByAltName(keyAltName: string): Promise<Document> {
    assertArgsDefinedType([keyAltName], ['string'], 'KeyVault.getKeyByAltName');
    return await makeSingleDocReturnValue(
      () => this._keyColl.find({ keyAltNames: keyAltName }),
      'KeyVault.getKeyByAltName',
      this._instanceState
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  @returnType('Cursor')
  @apiVersions([1])
  @returnsPromise
  async getKeys(): Promise<Cursor> {
    return new Cursor(
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
