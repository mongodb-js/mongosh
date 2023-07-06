import './textencoder-polyfill'; // for mongodb-connection-string-url in the java-shell
import ServiceProvider, { ServiceProviderCore } from './service-provider';
import getConnectInfo, { ConnectInfo } from './connect-info';
import type { ReplPlatform } from './platform';
const DEFAULT_DB = 'test';
import {
  ObjectId,
  DBRef,
  MaxKey,
  MinKey,
  Timestamp,
  BSONSymbol,
  Code,
  Decimal128,
  Int32,
  Long,
  Binary,
  calculateObjectSize,
  Double,
  EJSON,
  BSONRegExp,
} from 'bson';
import { bsonStringifiers } from './printable-bson';
import ShellAuthOptions from './shell-auth-options';
export * from './all-transport-types';
export * from './all-fle-types';

export { MapReduceOptions, FinalizeFunction } from './map-reduce-options';

export {
  CreateEncryptedCollectionOptions,
  CheckMetadataConsistencyOptions,
} from './admin';

const bson = {
  ObjectId,
  DBRef,
  MaxKey,
  MinKey,
  Timestamp,
  BSONSymbol,
  Code,
  Decimal128,
  Int32,
  Long,
  Binary,
  calculateObjectSize,
  Double,
  EJSON,
  BSONRegExp,
};

export {
  ServiceProvider,
  ShellAuthOptions,
  getConnectInfo,
  ReplPlatform,
  DEFAULT_DB,
  ServiceProviderCore,
  bson,
  bsonStringifiers,
  ConnectInfo,
};
