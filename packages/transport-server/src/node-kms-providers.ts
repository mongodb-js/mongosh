import NodeAwsKmsProvider from './node-aws-kms-provider';
import NodeLocalKmsProvider from './node-local-kms-provider';

/**
 * Valid options for a Node KMS Provider.
 */
export default interface NodeKmsProviders {
  aws?: NodeAwsKmsProvider;
  local?: NodeLocalKmsProvider;
}
