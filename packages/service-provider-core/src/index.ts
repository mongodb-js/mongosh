import './textencoder-polyfill'; // for mongodb-connection-string-url in the java-shell
import ServiceProvider, { ServiceProviderCore } from './service-provider';
import getConnectInfo, { ConnectInfo } from './connect-info';
import { ReplPlatform } from './platform';
import CliOptions from './cli-options';
import generateUri from './uri-generator';
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
  Map,
  calculateObjectSize,
  Double,
  EJSON,
  BSONRegExp
} from 'bson';
import { bsonStringifiers } from './printable-bson';
import ShellAuthOptions from './shell-auth-options';
export * from './all-transport-types';
export * from './all-fle-types';

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
  Map,
  calculateObjectSize,
  Double,
  EJSON,
  BSONRegExp
};

export {
  ServiceProvider,
  ShellAuthOptions,
  getConnectInfo,
  ReplPlatform,
  CliOptions,
  generateUri,
  DEFAULT_DB,
  ServiceProviderCore,
  bson,
  bsonStringifiers,
  ConnectInfo
};
