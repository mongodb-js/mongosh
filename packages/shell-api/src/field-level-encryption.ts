import {
  classPlatforms,
  hasAsyncChild,
  returnsPromise,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import {
  ClientEncryption as MongoCryptClientEncryption,
  ClientEncryptionCreateDataKeyProviderOptions,
  ClientEncryptionDataKeyProvider,
  ClientEncryptionOptions,
  ClientEncryptionEncryptOptions,
  KMSProviders,
  ReplPlatform
} from '@mongosh/service-provider-core';
import type { Document, BinaryType } from '@mongosh/service-provider-core';
import Collection from './collection';
import Cursor from './cursor';
import { DeleteResult } from './result';
import { assertArgsDefined, assertArgsType } from './helpers';
import { asPrintable } from './enums';
import { redactPassword } from '@mongosh/history';
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
  kmsProvider: ClientSideFieldLevelEncryptionKmsProvider,
  schemaMap?: Document,
  bypassAutoEncryption?: boolean;
}

@shellApiClassDefault
@hasAsyncChild
@classPlatforms([ ReplPlatform.CLI ] )
export class ClientEncryption extends ShellApiClass {
  public _mongo: Mongo;
  public _libmongocrypt: MongoCryptClientEncryption;

  constructor(mongo: Mongo) {
    super();
    this._mongo = mongo;

    const fle = mongo._serviceProvider.fle;
    if (!fle) {
      throw new MongoshRuntimeError('FLE API is not available');
    }

    this._libmongocrypt = new fle.ClientEncryption(
      mongo._serviceProvider.getRawClient(),
      {
        ...this._mongo._fleOptions
      } as ClientEncryptionOptions
    );
  }

  [asPrintable](): string {
    return `ClientEncryption class for ${redactPassword(this._mongo._uri)}`;
  }

  @returnsPromise
  async encrypt(
    encryptionId: BinaryType,
    value: any,
    encryptionAlgorithm: ClientEncryptionEncryptOptions['algorithm']
  ): Promise<BinaryType> {
    assertArgsDefined(encryptionId, value, encryptionAlgorithm);
    return await this._libmongocrypt.encrypt(
      value,
      {
        keyId: encryptionId,
        algorithm: encryptionAlgorithm
      }
    );
  }

  @returnsPromise
  async decrypt(
    encryptedValue: BinaryType
  ): Promise<any> {
    assertArgsDefined(encryptedValue);
    return await this._libmongocrypt.decrypt(encryptedValue);
  }
}

@shellApiClassDefault
@hasAsyncChild
@classPlatforms([ ReplPlatform.CLI ] )
export class KeyVault extends ShellApiClass {
  public _mongo: Mongo;
  public _clientEncryption: ClientEncryption;
  private _keyColl: Collection;
  constructor(clientEncryption: ClientEncryption) {
    super();
    this._mongo = clientEncryption._mongo;
    this._clientEncryption = clientEncryption;
    if (!this._mongo._fleOptions || !this._mongo._fleOptions.keyVaultNamespace) {
      throw new MongoshInvalidInputError('FLE options must be passed to the Mongo object');
    }
    const [ db, coll ] = this._mongo._fleOptions.keyVaultNamespace.split('.');
    this._keyColl = this._mongo.getDB(db).getCollection(coll);
  }

  [asPrintable](): string {
    return `KeyVault class for ${redactPassword(this._mongo._uri)}`;
  }

  createKey(kms: ClientEncryptionDataKeyProvider): Promise<Document>
  createKey(kms: ClientEncryptionDataKeyProvider, options: ClientEncryptionCreateDataKeyProviderOptions): Promise<Document>
  createKey(kms: ClientEncryptionDataKeyProvider, options: ClientEncryptionCreateDataKeyProviderOptions, ...args: any[]): never
  @returnsPromise
  createKey(
    kms: ClientEncryptionDataKeyProvider,
    options?: ClientEncryptionCreateDataKeyProviderOptions,
    ...args: any[]
  ): Promise<Document> {
    assertArgsDefined(kms);
    if (args && args.length) {
      throw new MongoshInvalidInputError(
        'KeyVault.createKey requires 1 or 2 arguments: KMS provider and the key provider options',
        CommonErrors.Deprecated
      );
    }
    return this._clientEncryption._libmongocrypt.createDataKey(kms, options as ClientEncryptionCreateDataKeyProviderOptions);
  }

  getKey(keyId: BinaryType): Cursor {
    assertArgsDefined(keyId);
    return this._keyColl.find({ '_id': keyId });
  }

  getKeyByAltName(keyAltName: string): Cursor {
    assertArgsDefined(keyAltName);
    assertArgsType([keyAltName], ['string']);
    return this._keyColl.find({ 'keyAltNames': keyAltName });
  }

  getKeys(): Cursor {
    return this._keyColl.find({});
  }

  @returnsPromise
  deleteKey(keyId: BinaryType): Promise<DeleteResult | Document> {
    assertArgsDefined(keyId);
    return this._keyColl.deleteOne({ '_id': keyId });
  }

  @returnsPromise
  addKeyAlternateName(keyId: BinaryType, keyAltName: string): Promise<Document> {
    assertArgsDefined(keyId, keyAltName);
    assertArgsType([keyAltName], ['string']);
    return this._keyColl.findAndModify({
      query: { '_id': keyId },
      update: { $push: { 'keyAltNames': keyAltName }, $currentDate: { 'updateDate': true } },
    });
  }

  @returnsPromise
  async removeKeyAlternateName(keyId: BinaryType, keyAltName: string): Promise<Document> {
    assertArgsDefined(keyId, keyAltName);
    assertArgsType([keyAltName], ['string']);
    const ret = await this._keyColl.findAndModify({
      query: { '_id': keyId },
      update: { $pull: { 'keyAltNames': keyAltName }, $currentDate: { 'updateDate': true } }
    });

    if (ret !== null && ret.keyAltNames !== undefined && ret.keyAltNames.length === 1 && ret.keyAltNames[0] === keyAltName) {
      // Remove the empty array to prevent duplicate key violations
      return this._keyColl.findAndModify({
        query: { '_id': keyId, 'keyAltNames': undefined },
        update: { $unset: { 'keyAltNames': '' }, $currentDate: { 'updateDate': true } }
      });
    }
    return ret;
  }
}
