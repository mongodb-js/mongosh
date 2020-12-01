
/**
 * Errors are grouped as follows:
 * * By "severity"
 *    * Codes starting with `1xxxx` can be circumvented by user action (rewrite code)
 *    * Codes starting with `9xxxx` are implementation limitations
 * * By "group"
 *    * Codes are separated in the `1xxxx` and `9xxxx` section by using `1x0xx`, `1x1xx`, etc. to split between classes
 * @mongoshErrors
 */
enum ShellApiErrors {
  /**
   * Signals the use of the `arrayFilters` method of the fluent Bulk API which is not yet supported.
   *
   * **Solution: Do not use the `arrayFilters` method of the fluent Bulk API.**
   */
  BulkUnimplementedArrayFilters = 'SHAPI-10001',

  /**
   * Signals the use of the `collation` method of the fluent Bulk API which is not yet supported.
   *
   * **Solution: As a workaround consider using `db.collection.bulkWrite(...)` which accepts
   * `collation` as a field in the operations.**
   */
  BulkUnimplementedCollation = 'SHAPI-10002',

  /**
   * Signals calling the `getOperations` method of the fluent Bulk API before the bulk has been executed.
   *
   * **Solution: Call `getOperations` only after the bulk has been executed.**
   */
  BulkGetOperationsBeforeExecute = 'SHAPI-10003',

  /**
   * Signals calling the `renameCollection` method of the Collection API with an invalid `newName` argument.
   *
   * **Solution: Verify `newName` is provided and is a string value.**
   */
  CollectionRenameCollectionNewNameInvalid = 'SHAPI-10101',

  /**
   * Signals calling the `dropIndex` method of the Collection API with `"*"` as an argument.
   *
   * **Solution: Use the `dropIndexes` method to drop multiple indexes.**
   */
  CollectionDropIndexStarInvalid = 'SHAPI-10102',

  /**
   * Signals calling the `dropIndex` method of the Collection API with an array as an argument.
   *
   * **Solution: Specify either the index name or the index specification document as an argument.**
   */
  CollectionDropIndexNoArray = 'SHAPI-10103',

  /**
   * Signals calling the `totalIndexSize` method of the Collection API with arguments.
   *
   * **Solution: `totalIndexSize` does not take any arguments. Use `db.collection.stats` to get detailed information.**
   */
  CollectionTotalIndexSizeNoArguments = 'SHAPI-10104',

  /**
   * Signals calling the `runCommand` method of the Collection API with the `commandName` argument either not being a string
   * or being specified as part of the `options`.
   *
   * **Solution: Make sure `commandName` is given as a string and not included as a property in the `options`.**
   */
  CollectionRunCommandCommandNameInvalid = 'SHAPI-10105',

  /**
   * Signals calling the `stats` method of the Collection API with both the `indexDetailsKey` and `indexDetailsName` argument.
   *
   * **Solution: Specify only one of the two.**
   */
  CollectionStatsIndexDetailsKeyAndName = 'SHAPI-10106',

  /**
   * Signals calling the `stats` method of the Collection API with the `indexDetailsKey` argument that is not an object.
   *
   * **Solution: Ensure `indexDetailsKey` is given as an object.**
   */
  CollectionStatsIndexDetailsKeyInvalid = 'SHAPI-10107',

  /**
   * Signals calling the `stats` method of the Collection API with the `indexDetailsName` argument that is not a string.
   *
   * **Solution: Ensure `indexDetailsName` is given as a string.**
   */
  CollectionStatsIndexDetailsNameInvalid = 'SHAPI-10108',

  /**
   * Signals calling the `mapReduce` method of the Collection API with the `options` argument as an object but
   * not defining its `out` property.
   *
   * **Solution: Ensure specifying the `out` property when giving `options` as an object.**
   */
  CollectionMapReduceOutOptionMissing = 'SHAPI-10109',

  /**
   * Signals calling `getShardDistribution` of the Collection API for a collection that is not sharded.
   *
   * **Solution: Only call `getShardDistribution` only on sharded collections.**
   */
  CollectionShardDistributionNotSharded = 'SHAPI-10110',

  /**
   * Signals calling `addOption` of the Cursor API with an unknown flag.
   *
   * **Solution: Refer to the `addOption` Cursor API documentation for valid flag values.**
   */
  CursorAddOptionUnknownFlag = 'SHAPI-10201',

  /**
   * Signals calling `maxScan` of the Cursor API which has been deprecated since MongoDB 4.0 and is not supported anymore.
   *
   * **Solution: Do not use `maxScan`.**
   */
  CusrorMaxScanRemoved = 'SHAPI-10202',

  /**
   * Signals calling `getCollection` of the Database API with an empty or only whitespace containing collection name.
   *
   * **Solution: Specify a valid collection name.**
   */
  DatabaseGetCollectionNameEmpty = 'SHAPI-10301',

  /**
   * Signals calling `createUser` of the Database API with an object that contains the `createUser` field.
   *
   * **Solution: Remove the `createUser` field from the object given to `createUser`.**
   */
  DatabaseCreateUserNoCreateUser = 'SHAPI-10302',

  /**
   * Signals calling `updateUser` of the Database API with an invalid `passwordDigestor`.
   *
   * **Solution: Specify a valid `passwordDigestor`.**
   */
  DatabaseUpdateUserPasswordDigestorInvalid = 'SHAPI-10303',

  /**
   * Signals calling `auth` of the Database API with invalid arguments.
   *
   * **Solution: either provide username and password as two separate arguments or provide a single object argument with `user` and `pwd` properties.**
   */
  DatabaseAuthArgsInvalid = 'SHAPI-10304',

  /**
   * Signals calling `auth` of the Database API with an object argument that uses the legacy `digestPassword` property.
   *
   * **Solution: Remove the `digestPassword` property.**
   */
  DatabaseAuthDigestPasswordUnsupported = 'SHAPI-10305',

  /**
   * Signals calling `createRole` of the Database API with an object that contains the `createRole` field.
   *
   * **Solution: Remove the `createRole` field from the object given to `createRole`.**
   */
  DatabaseCreateRoleNoCreateRole = 'SHAPI-10306',

  /**
   * Signals calling `printCollectionStats` of the Database API with an invalid `scale` argument.
   *
   * **Solution: Ensure `scale` is a number >= 1.**
   */
  DatabasePrintCollectionStatsScaleInvalid = 'SHAPI-10307',

  /**
   * Signals calling `enableFreeMonitoring` of the Database API on a non-primary node.
   *
   * **Solution: Connect to a primary node to call `enableFreeMonitoring`.**
   */
  DatabaseEnableFreeMonitoringNotPrimary = 'SHAPI-10308',

  /**
   * Signals calling `setProfilingLevel` of the Database API with an invalid `level`.
   *
   * **Solution: `level` must be in the range [0..2] (inclusive).**
   */
  DatabaseSetProfilingLevelLevelInvalid = 'SHAPI-10309',

  /**
   * Signals calling `setLogLevel` of the Database API with an invalid `component`.
   *
   * **Solution: When `component` is provided it must be of type `string`.**
   */
  DatabaseSetLogLevelComponentInvalid = 'SHAPI-10310',

  /**
   * Signals calling `cloneDatabase` of the Database API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Do not use `cloneDatabase`.**
   */
  DatabaseCloneDatabaseRemoved = 'SHAPI-10311',

  /**
   * Signals calling `colcloneCollection` of the Database API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Do not use `cloneCollection`.**
   */
  DatabaseCloneCollectionRemoved = 'SHAPI-10312',

  /**
   * Signals calling `copyDatabase` of the Database API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Do not use `copyDatabase`.**
   */
  DatabaseCopyDatabaseRemoved = 'SHAPI-10313',

  /**
   * Signals calling `printSecondaryReplicationInfo` of the Database API without being connected to a replica set.
   *
   * **Solution: Make sure you are connected to a replica set.**
   */
  DatabasePrintSecondaryReplicationInfoNoReplicaSet = 'SHAPI-10314',

  /**
   * Signals calling `getReplicationInfo` of the Database API without being connected to a replica set.
   *
   * **Solution: Make sure you are connected to a replica set.**
   */
  DatabaseGetReplicationInfoNoReplicaSet = 'SHAPI-10315',

  /**
   * Signals calling `printSlaveReplicationInfo` of the Database API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Do not use `printSlaveReplicationInfo`, use `printSecondaryReplicationInfo` instead.**
   */
  DatabasePrintSlaveReplicationInfoRemoved = 'SHAPI-10316',

  /**
   * Signals trying to retrieve the status of a shard or the sharding of the database in general without having sharding enabled.
   *
   * **Solution: Only run the respective command on a shard or database that has sharding enabled.**
   */
  ShardPrintableShardStatusDbNoSharding = 'SHAPI-10401',

  /**
   * Signals calling a method (e.g. `use <dbname>`) with an invalid database name.
   *
   * **Solution: Specify the database name as a non-empty string.**
   */
  MongoDatabaseNameInvalid = 'SHAPI-10501',

  /**
   * Signals calling `show <argument>` with an invalid `argument`.
   *
   * **Solution: Specify a valid argument for `show`.**
   */
  MongoShowArgumentInvalid = 'SHAPI-10502',

  /**
   * Signals calling `setCausalConsistency` or `isCausalConsistency` on the connection level which is not supported.
   *
   * **Solution: See the error message for details and use sessions instead.**
   */
  MongoCausalConsistencyNotSupportedForConnection = 'SHAPI-10503',

  /**
   * Signals calling `setSlaveOk` which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Do not use `setSlaveOk`.**
   */
  MongoSetSlaveOkRemoved = 'SHAPI-10504',

  /**
   * Signals calling `setSecondaryOk` which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Do not use `setSecondaryOk`.**
   */
  MongoSetSecondaryOkRemoved = 'SHAPI-10505',

  /**
   * Signals calling `planCacheQueryShapes` of the Plan Cache API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Use `PlanCache.list` instead.**
   */
  PlanCacheQueryShapesRemoved = 'SHAPI-10601',

  /**
   * Signals calling `getPlansByQuery` of the Plan Cache API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Use `PlanCache.list` instead.**
   */
  PlanCachePlansByQueryRemoved = 'SHAPI-10602',

  /**
   * Signals calling `printSlaveReplicationInfo` of the ReplicaSet API which has been deprecated in MongoDB 4.0 and removed.
   *
   * **Solution: Use `printSecondaryReplicationInfo` instead.**
   */
  ReplicaSetPrintSlaveReplicationInfoRemoved = 'SHAPI-10701',

  /**
   * Signals calling `add` or `addArb` of the ReplicaSet API without passing a proper host/port combination for the arbiter address.
   *
   * **Solution: Specify a valid host/port combination (e.g. `host.abc:27017`).**
   */
  ReplicaSetAddHostportInvalid = 'SHAPI-10702',

  /**
   * Signals callig `remove` of the ReplicaSet API and passing a hostname that is not part of the replica set.
   *
   * **Solution: Pass a hostname that is part of the replica set.**
   */
  ReplicSetRemoveHostNotFound = 'SHAPI-10703',

  /**
   * Signals calling `getDatabase` of the Session API with an invalid database name.
   *
   * **Solution: Specify a valid database name as non-empty `string`.**
   */
  SessionGetDatabaseNameInvalid = 'SHAPI-10801',

  /**
   * Signals calling `advanceClusterTime` of the Session API which is currently not yet supported.
   *
   * **Solution: Do not call `advanceClusterTime`.**
   */
  SessionAdvanceClusterTimeUnsupported = 'SHAPI-10802',

  /**
   * Signals an error while converting a BSON string to a valid ISODate.
   *
   * **Solution: Provide a valid ISODate string.**
   */
  ShellBsonIsoDateInvalid = 'SHAPI-11001',

  /**
   * Signals calling the `toIterator` method of the global shell with neither a Cursor nor an Array as an argument.
   *
   * **Solution: Only call `toIterator` with Cursors or an Array.**
   */
  ToIteratorNeitherCursorNorArray = 'SHAPI-12001',

  /**
   * Signals calling an API method and providing the `options` argument not as an object.
   *
   * **Solution: Always provide the `options` argument as an object.**
   */
  GenericOptionsMustBeAnObject = 'SHAPI-19001',

  /**
   * Signals calling an API method without all required arguments.
   *
   * **Solution: See the error output for details on missing arguments.**
   */
  GenericArgumentsMissing = 'SHAPI-19002',

  /**
   * Signals calling an API method with an object as argument that misses some of the required properties.
   *
   * **Solution: See the error output for details on missing properties.**
   */
  GenericPropertyMissing = 'SHAPI-19003',

  /**
   * Signals calling an API method or using an API class that has been deprecated and removed.
   *
   * **Solution: See the error output for details on alternatives or consult documentation.**
   */
  GenericClassDeprecation = 'SHAPI-19004',

  /**
   * Signals calling a method that takes a `verbosity` argument for the explain feature with an invalid `verbosity` value.
   *
   * **Solution: See the documentation for valid `verbosity` values.**
   */
  GenericExplainableVerbosityInvalid = 'SHAPI-19005',

  /**
   * Signals calling a method with an argument that did not match the expected type.
   *
   * **Solution: See the error output and documentation for details of the required value type.**
   */
  GenericArgumentTypeMismatch = 'SHAPI-19006',

  /**
   * Signals calling a method that takes a digest password property with an invalid `passwordDigestor`.
   *
   * **Solution: Specify a valid value for `passwordDigestor`.**
   */
  GenericDigestPasswordPasswordDigestorInvalid = 'SHAPI-19007',

  /**
   * Signals calling a method that takes a digest password property with an invalid `pwd`.
   *
   * **Solution: Ensure `pwd` is given as a `string` value.**
   */
  GenericDigestPasswordPasswordInvalid = 'SHAPI-19008',

  /**
   * Signals calling a method that requires to be connected to a `mongos` instead of just a `mongod`.
   *
   * **Solution: Ensure you are connected to a `mongos` instances.**
   */
  GenericNoMongos = 'SHAPI-19009',

  /**
   * Signals calling an operation that requires an active database connection without being connected.
   *
   * **Solution: Connect to a database before executing the operation.**
   */
  GenericNotConnected = 'SHAPI-19010',

  /**
   * Signals an internal issue of the Bulk API implementation.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  BulkStructureChanged = 'SHAPI-90001',

  /**
   * Signals an internal issue of the Collection API `stats` implementation.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  CollectionStatsFailed = 'SHAPI-90101',

  /**
   * Signals calling `addOption` of the Cursor API with the `SlaveOk` flag which is currently not supported.
   *
   * **Solution: Do not use the `SlaveOk` flag for now.**
   */
  CursorAddOptionSlaveOkUnsupported = 'SHAPI-90201',

  /**
   * Signals calling `readPref` of the Cursor API with the `tagSet` argument which is currently not supported.
   *
   * **Solution: Only call `readPref` without the `tagSet` argument.**
   */
  CursorReadPrefTagSetUnsupported = 'SHAPI-90202',

  /**
   * Signals calling `readConcern` of the Cursor API which is currently not supported.
   *
   * **Solution: Do not call `readConcern`.**
   */
  CursorReadConcernNotSupported = 'SHAPI-90203',

  /**
   * Signals an error while internally trying to get the server build info.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabaseServerBuildInfoFailed = 'SHAPI-90301',

  /**
   * Signals an internal error while trying to enable free monitoring on the database.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabaseEnableFreeMonitoringFailed = 'SHAPI-90302',

  /**
   * Signals an internal error while trying to get the log components.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabaseGetLogComponentsFailed = 'SHAPI-90303',

  /**
   * Signals an internal error while trying to get the command help.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabaseCommandHelpFailed = 'SHAPI-90304',

  /**
   * Signals an internal error while trying to list commands.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabaseListCommandsFailed = 'SHAPI-90305',

  /**
   * Signals an internal error while trying to get replication information and a member was null.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabasePrintSecondaryReplicationInfoMemberNull = 'SHAPI-90306',

  /**
   * Signals an internal error while trying to get replication information and the starting optime was null.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabasePrintSecondaryReplicationInfoStartOptimeDateNull = 'SHAPI-90307',

  /**
   * Signals an internal error while trying to get replication information and receiving local stats.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabaseGetReplicationInfoLocalStatsFailed = 'SHAPI-90308',

  /**
   * Signals an internal error while trying to get replication information and receiving local oplog.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  DatabasGetReplicationInfoLocalOplogEmpty = 'SHAPI-90309',

  /**
   * Signals an internal error.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  ShellApiClassMissesDecorator = 'SHAPI-90401',

  /**
   * Signals an internal error while executing `show dbs` or `show databases`.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  MongoShowListDatabasesFailed = 'SHAPI-90501',

  /**
   * Signals an internal error while trying to get the `readConcern`.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  MongoReadConcernFailed = 'SHAPI-90502',

  /**
   * Signals an internal error while trying to get the config of a replica set.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  ReplicaSetConfigFailed = 'SHAPI-90701',

  /**
   * Signals an internal error while retrieving local replica set information.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  ReplicaSetLocalDataUnexpected = 'SHAPI-90702',

  /**
   * Signals an internal error where the executed operation is not supported on the current platform / in the current environment.
   */
  ShellApiPlatformUnsupported = 'SHAPI-90901',

  /**
   * Signals calling the `load` method of the global shell which is currently not supported.
   */
  ShellApiLoadUnsupported = 'SHAPI-90902',

  /**
   * Signals calling the `passwordPrompt` method of the global shell which is not supported on the current platform / in the current environment.
   */
  ShellApiPasswordPromptUnsupported = 'SHAPI-90903',

  /**
   * Signals an internal error setting up BSON.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  ShellBsonClassNotProvided = 'SHAPI-91001',

  /**
   * Signals an internal error while trying to switch databases.
   *
   * Please file a bug report and attach the current log file for analysis.
   */
  ShellInternalSetDbToNonDb = 'SHAPI-92001',
}

export {
  ShellApiErrors
};
