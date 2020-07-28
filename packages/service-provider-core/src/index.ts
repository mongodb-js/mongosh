import ServiceProvider, { ServiceProviderCore } from './service-provider';
import Document from './document';
import Cursor, { CursorFlag, CURSOR_FLAGS } from './cursor';
import Result from './result';
import BulkWriteResult from './bulk-write-result';
import WriteConcern from './write-concern';
import ReadConcern from './read-concern';
import CommandOptions from './command-options';
import BaseOptions from './base-options';
import DatabaseOptions from './database-options';
import AuthOptions from './auth-options';
import getConnectInfo from './connect-info';
import { ReplPlatform } from './platform';
import CliOptions from './cli-options';
import generateUri, { Scheme } from './uri-generator';
const DEFAULT_DB = 'test';
import bson from 'bson';

export {
  ServiceProvider,
  BulkWriteResult,
  Document,
  Cursor,
  CursorFlag,
  CURSOR_FLAGS,
  Result,
  ReadConcern,
  WriteConcern,
  CommandOptions,
  BaseOptions,
  AuthOptions,
  DatabaseOptions,
  getConnectInfo,
  ReplPlatform,
  CliOptions,
  generateUri,
  Scheme,
  DEFAULT_DB,
  ServiceProviderCore,
  bson
};
