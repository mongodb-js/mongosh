import { Document, BinaryType } from '@mongosh/service-provider-core';

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
