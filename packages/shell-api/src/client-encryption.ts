import { classPlatforms, hasAsyncChild, returnsPromise, ShellApiClass, shellApiClassDefault } from './decorators';
import { ReplPlatform, BinaryType } from '@mongosh/service-provider-core';
import { assertArgsDefined } from './helpers';

@shellApiClassDefault
@hasAsyncChild
@classPlatforms([ ReplPlatform.CLI ] )
export default class ClientEncryption extends ShellApiClass {
  public _mongo: any; // Mongo but any to avoid circular ref
  public _innerCE: any;

  constructor(mongo: any) {
    super();
    this._mongo = mongo;
    this._innerCE = new mongo._serviceProvider.fle.ClientEncryption(
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
    return this._innerCE.encrypt(
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
    return this._innerCE.decrypt(encryptedValue);
  }
}

