export type {
  AWSEncryptionKeyOptions,
  AzureEncryptionKeyOptions,
  GCPEncryptionKeyOptions,
  ClientEncryption,
  ClientEncryptionCreateDataKeyCallback,
  ClientEncryptionCreateDataKeyProviderOptions,
  ClientEncryptionDataKeyProvider,
  ClientEncryptionDecryptCallback,
  ClientEncryptionEncryptCallback,
  ClientEncryptionEncryptOptions,
  ClientEncryptionOptions,
  ClientEncryptionTlsOptions,
  KMSProviders
} from 'mongodb-client-encryption';

export type FLE = typeof import('mongodb-client-encryption');
