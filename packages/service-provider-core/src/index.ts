import ServiceProvider, { ServiceProviderCore } from './service-provider';
import getConnectInfo, { ConnectInfo } from './connect-info';
import { ReplPlatform } from './platform';
import CliOptions from './cli-options';
import generateUri, { Scheme } from './uri-generator';
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
  Double
} from 'bson';
import ServiceProviderBulkOp, { ServiceProviderBulkFindOp, BulkBatch } from './bulk';
import { bsonStringifiers } from './printable-bson';
import ShellAuthOptions from './shell-auth-options';
export * from './all-transport-types';

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
  Double
};

export {
  ServiceProvider,
  ShellAuthOptions,
  getConnectInfo,
  ReplPlatform,
  CliOptions,
  generateUri,
  Scheme,
  DEFAULT_DB,
  ServiceProviderCore,
  bson,
  bsonStringifiers,
  ServiceProviderBulkFindOp,
  ServiceProviderBulkOp,
  BulkBatch,
  ConnectInfo
};
