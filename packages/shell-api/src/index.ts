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
export type { ShellBson } from './shell-bson';
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
  ServerVersions,
  Topologies,
  InterruptFlag,
};
