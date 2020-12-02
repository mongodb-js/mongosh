import ServiceProvider, { ServiceProviderCore } from './service-provider';
import getConnectInfo from './connect-info';
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
  calculateObjectSize
} from 'bson';
import ServiceProviderBulkOp, { ServiceProviderBulkFindOp, BulkBatch } from './bulk';
import makePrintableBson, { bsonStringifiers } from './printable-bson';
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
  calculateObjectSize
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
  makePrintableBson,
  bsonStringifiers,
  ServiceProviderBulkFindOp,
  ServiceProviderBulkOp,
  BulkBatch
};
