import './textencoder-polyfill'; // for mongodb-connection-string-url in the java-shell
import ServiceProvider, { ServiceProviderCore } from './service-provider';
import getConnectInfo, { ConnectInfo } from './connect-info';
import type { ReplPlatform } from './platform';
const DEFAULT_DB = 'test';
import { bsonStringifiers } from './printable-bson';
import ShellAuthOptions from './shell-auth-options';
export * from './all-transport-types';
export * from './all-fle-types';

export { MapReduceOptions, FinalizeFunction } from './map-reduce-options';

export {
  CreateEncryptedCollectionOptions,
  CheckMetadataConsistencyOptions,
} from './admin';

export { bson } from './bson-export';

export {
  ServiceProvider,
  ShellAuthOptions,
  getConnectInfo,
  ReplPlatform,
  DEFAULT_DB,
  ServiceProviderCore,
  bsonStringifiers,
  ConnectInfo,
};
