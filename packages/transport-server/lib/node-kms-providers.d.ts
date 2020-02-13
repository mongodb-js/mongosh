import NodeAwsKmsProvider from './node-aws-kms-provider';
import NodeLocalKmsProvider from './node-local-kms-provider';
interface NodeKmsProviders {
    aws?: NodeAwsKmsProvider;
    local?: NodeLocalKmsProvider;
}
export default NodeKmsProviders;
