import NodeKmsProviders from './node-kms-providers';

/**
 * Valid options that can be used with the Node driver for
 * client side FLE.
 *
 * @todo: Durran: Use JSON Schema type for schema map?
 */
export default interface NodeFleOptions {
  kmsProviders: NodeKmsProviders;
  keyVaultNamespace?: string;
  schemaMap?: any;
}
