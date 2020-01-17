import NodeAwsKmsProvider from './node-aws-kms-provider';
import NodeLocalKmsProvider from './node-local-kms-provider';

/**
 * Valid options for a Node KMS Provider.
 */
interface NodeKmsProviders {
  aws?: NodeAwsKmsProvider;
  local?: NodeLocalKmsProvider;
}

export default NodeKmsProviders;
