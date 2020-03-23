import NodeKmsProviders from './node-kms-providers';
interface NodeFleOptions {
    kmsProviders: NodeKmsProviders;
    keyVaultNamespace?: string;
    schemaMap?: any;
}
export default NodeFleOptions;
