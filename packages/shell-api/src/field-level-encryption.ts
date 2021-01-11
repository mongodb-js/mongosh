import { classPlatforms, hasAsyncChild, returnsPromise, ShellApiClass, shellApiClassDefault } from './decorators';
import { Document, ReplPlatform, BinaryType } from '@mongosh/service-provider-core';
import Collection from './collection';
import Cursor from './cursor';
import { DeleteResult } from './result';
import { assertArgsDefined, assertArgsType } from './helpers';
import { MongoshInvalidInputError } from '@mongosh/errors';

/** Configuration options for using 'aws' as your KMS provider */
declare interface awsKms {
  aws: {
    /** The access key used for the AWS KMS provider */
    accessKeyId?: string;
    /** The secret access key used for the AWS KMS provider */
    secretAccessKey?: string;
  };
}

/** Configuration options for using 'local' as your KMS provider */
declare interface localKms {
  local: {
    /** The master key used to encrypt/decrypt data keys. A 96-byte long Buffer. */
    key: BinaryType;
  };
}

export interface ClientSideFieldLevelEncryptionOptions {
  keyVaultClient?: any, /** This should be a Mongo class instance, but to avoid circular ref use any **/
  keyVaultNamespace: string,
  kmsProvider: awsKms | localKms,
  schemaMap?: Document,
  bypassAutoEncryption?: boolean;
}

@shellApiClassDefault
@hasAsyncChild
@classPlatforms([ ReplPlatform.CLI ] )
export class ClientEncryption extends ShellApiClass {
  public _mongo: any; // Mongo but any to avoid circular ref
  public _libmongocrypt: any;

  constructor(mongo: any) {
    super();
    this._mongo = mongo;
    this._libmongocrypt = new mongo._serviceProvider.fle.ClientEncryption(
      mongo._serviceProvider.getRawClient(),
      {
        options: this._mongo._fleOptions
      }
    );
  }

  @returnsPromise
  encrypt(
    encryptionId: BinaryType,
    value: any,
    encryptionAlgorithm: string
  ): BinaryType {
    assertArgsDefined(encryptionId, value, encryptionAlgorithm);
    return this._libmongocrypt.encrypt(
      value,
      {
        keyId: encryptionId,
        algorithm: encryptionAlgorithm
      }
    );
  }

  @returnsPromise
  decrypt(
    encryptedValue: any
  ): BinaryType {
    assertArgsDefined(encryptedValue);
    return this._libmongocrypt.decrypt(encryptedValue);
  }
}

@shellApiClassDefault
@hasAsyncChild
@classPlatforms([ ReplPlatform.CLI ] )
export class KeyVault extends ShellApiClass {
  public _mongo: any; // Mongo but any to avoid circular ref
  public _clientEncryption: ClientEncryption;
  private _keyColl: Collection;
  constructor(mongo: any, clientEncryption: ClientEncryption) {
    super();
    this._mongo = mongo;
    this._clientEncryption = clientEncryption;
    const [ db, coll ] = mongo._fleOptions.keyVaultNamespace.split('.');
    if (coll.includes('.')) {
      throw new MongoshInvalidInputError('keyVaultNamespace must be <db>.<coll>');
    }
    this._keyColl = mongo.getDB(db).getCollection(coll);
  }

  @returnsPromise
  createKey(
    kms: string | Document,
    customMasterKey: string | Document, // doc defined here: https://github.com/mongodb/specifications/blob/master/source/client-side-encryption/client-side-encryption.rst#masterkey
    keyAltName?: string[]
  ): Document {
    assertArgsDefined(kms, customMasterKey);
    const options = {} as any;

    if (typeof customMasterKey === 'string') {
      options.masterKey.key = customMasterKey;
    } else {
      options.masterKey = customMasterKey;
    }
    if (keyAltName) {
      options.keyAltNames = keyAltName;
    }
    return this._clientEncryption._libmongocrypt.createDataKey(kms, options);
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
    return this._keyColl.find();
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

    if (ret !== null && ret.keyAltNames.length === 1 && ret.keyAltNames[0] === keyAltName) {
      // Remove the empty array to prevent duplicate key violations
      return this._keyColl.findAndModify({
        query: { '_id': keyId, 'keyAltNames': undefined },
        update: { $unset: { 'keyAltNames': '' }, $currentDate: { 'updateDate': true } }
      });
    }
    return ret;
  }
}
