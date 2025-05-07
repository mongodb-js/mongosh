// TODO: does it make sense to have all this stuff? Don't we just need enough for the top-level API, ie. the globals?
import AggregationCursor from './aggregation-cursor';
import RunCommandCursor from './run-command-cursor';
export { Collection } from './collection';
import Cursor from './cursor';
import Database, { CollectionNamesWithTypes } from './database';
import Explainable from './explainable';
import ExplainableCursor from './explainable-cursor';
import Help, { HelpProperties } from './help';
export {
  ShellInstanceState,
  EvaluationListener,
  ShellCliOptions,
  OnLoadResult,
  ShellPlugin,
  AutocompleteParameters,
} from './shell-instance-state';
import Shard from './shard';
import ReplicaSet from './replica-set';
import ShellApi from './shell-api';
export {
  BulkWriteResult,
  CommandResult,
  CursorIterationResult,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  UpdateResult,
} from './result';
import Mongo from './mongo';
export {
  signatures,
  ShellResult,
  toShellResult,
  getShellApiType,
  TypeSignature,
  Namespace,
} from './decorators';
import { Topologies, ServerVersions } from './enums';
import { InterruptFlag } from './interruptor';
import { ShellBson } from './shell-bson';
export type {
  GenericCollectionSchema,
  GenericDatabaseSchema,
  GenericServerSideSchema,
  StringKey,
  FindAndModifyMethodShellOptions,
  FindAndModifyShellOptions,
  RemoveShellOptions,
} from './helpers';
export type { Streams } from './streams';
export type { StreamProcessor } from './stream-processor';

export {
  AggregationCursor,
  RunCommandCursor,
  CollectionNamesWithTypes,
  Cursor,
  Database,
  Explainable,
  ExplainableCursor,
  Help,
  HelpProperties,
  Mongo,
  Shard,
  ReplicaSet,
  ShellApi,
  ShellBson,
  ServerVersions,
  Topologies,
  InterruptFlag,
};

// TODO: do we really want all these?

/*
export { AggregateOrFindCursor } from './aggregate-or-find-cursor';
export {
  ServiceProviderFindCursor,
  ServiceProviderAggregationCursor,
  ReadPreferenceLike,
  ReadConcernLevel,
  TagSet,
  CollationOptions,
  HedgeOptions,
  ExplainVerbosityLike,
  FindOptions,
  CountOptions,
  DistinctOptions,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  UpdateOptions,
  CommandOperationOptions,
  AggregateOptions
} from '@mongosh/service-provider-core';
export { DatabaseImpl } from './database';
export { CollectionImpl } from './collection';
export { ShellResultSourceInformation, ShellCommandCompleter, Signatures, ShellApiWithMongoClass } from './decorators';
export { MapReduceShellOptions } from './helpers';

// and many more
*/
