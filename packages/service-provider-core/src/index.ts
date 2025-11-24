import './textencoder-polyfill'; // for mongodb-connection-string-url in the java-shell
import ServiceProvider, { ServiceProviderCore } from './service-provider';
import getConnectExtraInfo, { ConnectionExtraInfo } from './connect-info';
import type { ReplPlatform } from './platform';
const DEFAULT_DB = 'test';
import ShellAuthOptions from './shell-auth-options';
export * from './all-transport-types';
export * from './all-fle-types';

export { MapReduceOptions, FinalizeFunction } from './map-reduce-options';

export { TopologyDescription, ServerDescription } from './readable';

export {
  CreateEncryptedCollectionOptions,
  CheckMetadataConsistencyOptions,
  ConnectionInfo,
} from './admin';

export {
  ServiceProviderAbstractCursor,
  ServiceProviderAggregationCursor,
  ServiceProviderBaseCursor,
  ServiceProviderFindCursor,
  ServiceProviderRunCommandCursor,
  ServiceProviderChangeStream,
} from './cursors';

export {
  ServiceProvider,
  ShellAuthOptions,
  getConnectExtraInfo,
  ReplPlatform,
  DEFAULT_DB,
  ServiceProviderCore,
  ConnectionExtraInfo,
};
