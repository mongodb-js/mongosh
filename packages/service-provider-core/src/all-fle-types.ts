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
  KMSProviders,
} from 'mongodb-client-encryption';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type FLE = typeof import('mongodb-client-encryption');
