/* eslint no-use-before-define: 0 */
import type {
  DbOptions,
  Document,
  ExplainVerbosityLike,
  FindOneAndDeleteOptions,
  FindOneAndReplaceOptions,
  FindOneAndUpdateOptions,
  DeleteOptions,
  MapReduceOptions,
  ExplainOptions,
} from '@mongosh/service-provider-core';
import {
  CommonErrors,
  MongoshInvalidInputError,
  MongoshUnimplementedError,
} from '@mongosh/errors';
import crypto from 'crypto';
import type Database from './database';
import type Collection from './collection';
import type { CursorIterationResult } from './result';
import { ShellApiErrors } from './error-codes';
import type {
  BinaryType,
  ReplPlatform,
  bson,
} from '@mongosh/service-provider-core';
import type { ClientSideFieldLevelEncryptionOptions } from './field-level-encryption';
import type { AutoEncryptionOptions, Long, ObjectId, Timestamp } from 'mongodb';
import { shellApiType } from './enums';
import type { AbstractCursor } from './abstract-cursor';
import type ChangeStreamCursor from './change-stream-cursor';
import type { ShellBson } from './shell-bson';
import { inspect } from 'util';

/**
 * Helper method to adapt aggregation pipeline options.
 * This is here so that it's not visible to the user.
 *
 * @param options
 */
export function adaptAggregateOptions(options: any = {}): {
  aggOptions: Document;
  dbOptions: DbOptions;
  explain?: ExplainVerbosityLike & string;
} {
  const aggOptions = { ...options };

  const dbOptions: DbOptions = {};
  let explain;

  if ('readConcern' in aggOptions) {
    dbOptions.readConcern = options.readConcern;
    delete aggOptions.readConcern;
  }

  if ('writeConcern' in aggOptions) {
    Object.assign(dbOptions, options.writeConcern);
    delete aggOptions.writeConcern;
  }

  if ('explain' in aggOptions) {
    explain = validateExplainableVerbosity(aggOptions.explain);
    delete aggOptions.explain;
  }

  return { aggOptions, dbOptions, explain };
}

export function validateExplainableVerbosity(
  verbosity?: ExplainVerbosityLike
): ExplainVerbosityLike & string {
  // Legacy shell behavior.
  if (verbosity === true) {
    verbosity = 'allPlansExecution';
  } else if (verbosity === false || verbosity === undefined) {
    verbosity = 'queryPlanner';
  }

  if (typeof verbosity !== 'string') {
    throw new MongoshInvalidInputError(
      'verbosity must be a string',
      CommonErrors.InvalidArgument
    );
  }

  return verbosity;
}

function getAssertCaller(caller?: string): string {
  return caller ? ` (${caller})` : '';
}

// Fields to add to a $match/filter on config.collections to only get
// collections that are actually sharded
export const onlyShardedCollectionsInConfigFilter = {
  // dropped is gone on newer server versions, so check for !== true
  // rather than for === false (SERVER-51880 and related)
  dropped: { $ne: true },
  // unsplittable introduced in SPM-3364 to mark unsharded collections
  // that are still being tracked in the catalog
  unsplittable: { $ne: true },
} as const;

export function assertArgsDefinedType(
  args: any[],
  expectedTypes: Array<true | string | Array<string | undefined>>,
  func?: string
): void {
  args.forEach((arg, i) => {
    const expected = expectedTypes[i];
    if (arg === undefined) {
      if (
        expected !== true &&
        Array.isArray(expected) &&
        expected.includes(undefined)
      ) {
        return;
      }
      throw new MongoshInvalidInputError(
        `Missing required argument at position ${i}${getAssertCaller(func)}`,
        CommonErrors.InvalidArgument
      );
    } else if (expected === true) {
      return;
    }

    const expectedTypesList: Array<string | undefined> =
      typeof expected === 'string' ? [expected] : expected;
    const isExpectedTypeof = expectedTypesList.includes(typeof arg);
    const isExpectedBson = expectedTypesList.includes(`bson:${arg?._bsontype}`);

    if (!isExpectedTypeof && !isExpectedBson) {
      const expectedMsg = expectedTypesList
        .filter((e) => e !== undefined)
        .map((e) => e?.replace(/^bson:/, ''))
        .join(' or ');
      throw new MongoshInvalidInputError(
        `Argument at position ${i} must be of type ${expectedMsg}, got ${typeof arg} instead${getAssertCaller(
          func
        )}`,
        CommonErrors.InvalidArgument
      );
    }
  });
}

export function assertKeysDefined(object: any, keys: string[]): void {
  for (const key of keys) {
    if (object[key] === undefined) {
      throw new MongoshInvalidInputError(
        `Missing required property: ${JSON.stringify(key)}`,
        CommonErrors.InvalidArgument
      );
    }
  }
}

/**
 * Helper method to adapt objects that are slightly different from Shell to SP API.
 *
 * @param {Object} shellToCommand - a map of the shell key to the command key. If null, then omit.
 * @param {Object} shellDoc - the document to be adapted
 */
export function adaptOptions(
  shellToCommand: any,
  additions: any,
  shellDoc: any
): any {
  return Object.keys(shellDoc).reduce((result, shellKey) => {
    if (shellToCommand[shellKey] === null) {
      return result;
    }
    result[shellToCommand[shellKey] || shellKey] = shellDoc[shellKey];
    return result;
  }, additions);
}

/**
 * Optionally digest password if passwordDigestor field set to 'client'. If it's false,
 * then hash the password.
 *
 * @param username
 * @param passwordDigestor
 * @param {Object} command
 */
export function processDigestPassword(
  username: string,
  passwordDigestor: 'server' | 'client',
  command: { pwd: string }
): { digestPassword?: boolean; pwd?: string } {
  if (passwordDigestor === undefined) {
    return {};
  }
  if (passwordDigestor !== 'server' && passwordDigestor !== 'client') {
    throw new MongoshInvalidInputError(
      `Invalid field: passwordDigestor must be 'client' or 'server', got ${passwordDigestor}`,
      CommonErrors.InvalidArgument
    );
  }
  if (passwordDigestor === 'client') {
    if (typeof command.pwd !== 'string') {
      throw new MongoshInvalidInputError(
        `User passwords must be of type string. Was given password with type ${typeof command.pwd}`,
        CommonErrors.InvalidArgument
      );
    }
    // NOTE: this code has raised a code scanning alert about the "use of a broken or weak cryptographic algorithm":
    // we inherited this code from `mongo`, and we cannot replace MD5 with a different algorithm, since MD5 is part of the SCRAM-SHA-1 protocol,
    // and the purpose of `passwordDigestor=client` is to improve the security of SCRAM-SHA-1, allowing the creation of new users
    // without the need to communicate their password to the server.
    const hash = crypto.createHash('md5');
    hash.update(`${username}:mongo:${command.pwd}`);
    const digested = hash.digest('hex');
    return { digestPassword: false, pwd: digested };
  }
  return { digestPassword: true };
}

/**
 * Return an object which will become a ShardingStatusResult
 * @param mongo
 * @param configDB
 * @param verbose
 */
export async function getPrintableShardStatus(
  configDB: Database,
  verbose: boolean
): Promise<ShardingStatusResult> {
  const result = {} as ShardingStatusResult;

  // configDB is a DB object that contains the sharding metadata of interest.
  const mongosColl = configDB.getCollection('mongos');
  const versionColl = configDB.getCollection('version');
  const shardsColl = configDB.getCollection('shards');
  const chunksColl = configDB.getCollection('chunks');
  const settingsColl = configDB.getCollection('settings');
  const changelogColl = configDB.getCollection('changelog');

  const [version, shards, mostRecentMongos] = await Promise.all([
    versionColl.findOne(
      {},
      {
        minCompatibleVersion: 0,
        excluding: 0,
        upgradeId: 0,
        upgradeState: 0,
      }
    ),
    shardsColl.find().then((cursor) => cursor.sort({ _id: 1 }).toArray()),
    mongosColl
      .find()
      .then((cursor) => cursor.sort({ ping: -1 }).limit(1).tryNext()),
  ]);
  if (version === null) {
    throw new MongoshInvalidInputError(
      'This db does not have sharding enabled. Be sure you are connecting to a mongos from the shell and not to a mongod.',
      ShellApiErrors.NotConnectedToMongos
    );
  }

  result.shardingVersion = version as {
    _id: number;
    clusterId: ObjectId;
  };

  result.shards = shards as ShardingStatusResult['shards'];

  // (most recently) active mongoses
  const mongosActiveThresholdMs = 60000;
  let mostRecentMongosTime = null;
  let mongosAdjective = 'most recently active';
  if (mostRecentMongos !== null) {
    mostRecentMongosTime = mostRecentMongos.ping;
    // Mongoses older than the threshold are the most recent, but cannot be
    // considered "active" mongoses. (This is more likely to be an old(er)
    // configdb dump, or all the mongoses have been stopped.)
    if (
      mostRecentMongosTime.getTime() >=
      Date.now() - mongosActiveThresholdMs
    ) {
      mongosAdjective = 'active';
    }
  }

  if (mostRecentMongosTime === null) {
    result[`${mongosAdjective} mongoses`] = 'none';
  } else {
    const recentMongosQuery = {
      ping: {
        $gt: ((): any => {
          const d = mostRecentMongosTime;
          d.setTime(d.getTime() - mongosActiveThresholdMs);
          return d;
        })(),
      },
    };

    if (verbose) {
      result[`${mongosAdjective} mongoses`] = await (
        await mongosColl.find(recentMongosQuery)
      )
        .sort({ ping: -1 })
        .toArray();
    } else {
      result[`${mongosAdjective} mongoses`] = (
        (await (
          await mongosColl.aggregate([
            { $match: recentMongosQuery },
            { $group: { _id: '$mongoVersion', num: { $sum: 1 } } },
            { $sort: { num: -1 } },
          ])
        ).toArray()) as { _id: string; num: number }[]
      ).map((z: { _id: string; num: number }) => {
        return { [z._id]: z.num };
      });
    }
  }

  const balancerRes = {} as ShardingStatusResult['balancer'];
  await Promise.all([
    (async (): Promise<void> => {
      // Is autosplit currently enabled
      const autosplit = await settingsColl.findOne({ _id: 'autosplit' });
      result.autosplit = {
        'Currently enabled':
          autosplit === null || autosplit.enabled ? 'yes' : 'no',
      };
    })(),
    (async (): Promise<void> => {
      // Is automerge currently enabled, available since >= 7.0
      const automerge = await settingsColl.findOne({ _id: 'automerge' });
      if (automerge) {
        result.automerge = {
          'Currently enabled': automerge.enabled ? 'yes' : 'no',
        };
      }
    })(),
    (async (): Promise<void> => {
      // Is the balancer currently enabled
      const balancerEnabled = await settingsColl.findOne({ _id: 'balancer' });
      balancerRes['Currently enabled'] =
        balancerEnabled === null || !balancerEnabled.stopped ? 'yes' : 'no';
    })(),
    (async (): Promise<void> => {
      // Is the balancer currently active
      let balancerRunning: 'yes' | 'no' | 'unknown' = 'unknown';
      try {
        const balancerStatus = await configDB.adminCommand({
          balancerStatus: 1,
        });
        balancerRunning = balancerStatus.inBalancerRound ? 'yes' : 'no';
      } catch {
        // pass, ignore all error messages
      }
      balancerRes['Currently running'] = balancerRunning;
    })(),
    (async (): Promise<void> => {
      // Output the balancer window
      const settings = await settingsColl.findOne({ _id: 'balancer' });
      if (
        settings !== null &&
        Object.prototype.hasOwnProperty.call(settings, 'activeWindow')
      ) {
        const balSettings = settings.activeWindow;
        balancerRes[
          'Balancer active window is set between'
        ] = `${balSettings.start} and ${balSettings.stop} server local time`;
      }
    })(),
    (async (): Promise<void> => {
      // Output the list of active migrations
      type Lock = { _id: string; when: Date };
      const activeLocks: Lock[] = (await (
        await configDB.getCollection('locks').find({ state: { $eq: 2 } })
      ).toArray()) as Lock[];
      if (activeLocks?.length > 0) {
        balancerRes['Collections with active migrations'] = activeLocks.map(
          (lock) => {
            return `${lock._id} started at ${lock.when}` as const;
          }
        );
      }
    })(),
    (async (): Promise<void> => {
      // Actionlog and version checking only works on 2.7 and greater
      let versionHasActionlog = !version.currentVersion; // means that we are in a version where it is deprecated (SERVER-68888)
      const metaDataVersion = version.currentVersion;
      if (metaDataVersion > 5) {
        versionHasActionlog = true;
      }
      if (metaDataVersion === 5) {
        const verArray = (await configDB.serverBuildInfo()).versionArray;
        if (verArray[0] === 2 && verArray[1] > 6) {
          versionHasActionlog = true;
        }
      }

      if (versionHasActionlog) {
        // Review config.actionlog for errors
        const balErrs = await (
          await configDB
            .getCollection('actionlog')
            .find({ what: 'balancer.round' })
        )
          .sort({ time: -1 })
          .limit(5)
          .toArray();
        const actionReport = { count: 0, lastErr: '', lastTime: ' ' };
        if (balErrs !== null) {
          balErrs.forEach((r: any) => {
            if (r.details.errorOccured) {
              actionReport.count += 1;
              if (actionReport.count === 1) {
                actionReport.lastErr = r.details.errmsg;
                actionReport.lastTime = r.time;
              }
            }
          });
        }
        // Always print the number of failed rounds
        balancerRes['Failed balancer rounds in last 5 attempts'] =
          actionReport.count;

        // Only print the errors if there are any
        if (actionReport.count > 0) {
          balancerRes['Last reported error'] = actionReport.lastErr;
          balancerRes['Time of Reported error'] = actionReport.lastTime;
        }
        // const migrations = sh.getRecentMigrations(configDB);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        type MigrationResult =
          | {
              _id: 'Success';
              count: number;
              from: never;
              to: never;
            }
          // Failed migration
          | {
              _id: string;
              count: number;
              from: string;
              to: string;
            };

        // Successful migrations.
        let migrations = (await (
          await changelogColl.aggregate([
            {
              $match: {
                time: { $gt: yesterday },
                what: 'moveChunk.from',
                'details.errmsg': { $exists: false },
                'details.note': 'success',
              },
            },
            { $group: { _id: { msg: '$details.errmsg' }, count: { $sum: 1 } } },
            {
              $project: {
                _id: { $ifNull: ['$_id.msg', 'Success'] },
                count: '$count',
              },
            },
          ])
        ).toArray()) as MigrationResult[];

        // Failed migrations.
        migrations = migrations.concat(
          (await (
            await changelogColl.aggregate([
              {
                $match: {
                  time: { $gt: yesterday },
                  what: 'moveChunk.from',
                  $or: [
                    { 'details.errmsg': { $exists: true } },
                    { 'details.note': { $ne: 'success' } },
                  ],
                },
              },
              {
                $group: {
                  _id: {
                    msg: '$details.errmsg',
                    from: '$details.from',
                    to: '$details.to',
                  },
                  count: { $sum: 1 },
                },
              },
              {
                $project: {
                  _id: { $ifNull: ['$_id.msg', 'aborted'] },
                  from: '$_id.from',
                  to: '$_id.to',
                  count: '$count',
                },
              },
            ])
          ).toArray()) as MigrationResult[]
        );

        const migrationsRes: ShardingStatusResult['balancer']['Migration Results for the last 24 hours'] =
          {};
        migrations.forEach((x) => {
          if (x._id === 'Success') {
            migrationsRes[x.count] = x._id;
          } else {
            migrationsRes[
              x.count
            ] = `Failed with error '${x._id}', from ${x.from} to ${x.to}`;
          }
        });
        if (migrations.length === 0) {
          balancerRes['Migration Results for the last 24 hours'] =
            'No recent migrations';
        } else {
          balancerRes['Migration Results for the last 24 hours'] =
            migrationsRes;
        }
      }
    })(),
  ]);
  result.balancer = balancerRes;

  // All databases in config.databases + those implicitly referenced
  // by a sharded collection in config.collections
  // (could become a single pipeline using $unionWith when we drop 4.2 server support)
  const [databases, collections, shardedDataDistribution] = await Promise.all([
    (async () =>
      await (await configDB.getCollection('databases').find())
        .sort({ _id: 1 })
        .toArray())(),
    (async () =>
      await (
        await configDB.getCollection('collections').find({
          ...onlyShardedCollectionsInConfigFilter,
        })
      )
        .sort({ _id: 1 })
        .toArray())(),
    (async () => {
      try {
        // $shardedDataDistribution is available since >= 6.0.3
        const adminDB = configDB.getSiblingDB('admin');
        return (await (
          await adminDB.aggregate([{ $shardedDataDistribution: {} }])
        ).toArray()) as ShardedDataDistribution;
      } catch {
        // Pass, most likely an older version.
        return undefined;
      }
    })(),
  ]);

  result.shardedDataDistribution = shardedDataDistribution;

  // Special case the config db, since it doesn't have a record in config.databases.
  databases.push({ _id: 'config', primary: 'config', partitioned: true });

  for (const coll of collections) {
    if (!databases.find((db) => coll._id.startsWith(db._id + '.'))) {
      databases.push({ _id: coll._id.split('.')[0] });
    }
  }

  databases.sort((a: any, b: any): number => {
    return a._id.localeCompare(b._id);
  });

  result.databases = (
    await Promise.all(
      databases.map(async (db) => {
        const colls = collections.filter((coll) =>
          coll._id.startsWith(db._id + '.')
        );

        const collList = await Promise.all(
          colls.map(async (coll) => {
            const collRes = {} as any;
            collRes.shardKey = coll.key;
            collRes.unique = !!coll.unique;
            if (
              typeof coll.unique !== 'boolean' &&
              typeof coll.unique !== 'undefined'
            ) {
              collRes.unique = [!!coll.unique, { unique: coll.unique }];
            }
            collRes.balancing = !coll.noBalance;
            if (
              typeof coll.noBalance !== 'boolean' &&
              typeof coll.noBalance !== 'undefined'
            ) {
              collRes.balancing = [
                !coll.noBalance,
                { noBalance: coll.noBalance },
              ];
            }

            const chunksRes = [];
            const chunksCollMatch = buildConfigChunksCollectionMatch(coll);
            const chunks = await (
              await chunksColl.aggregate([
                { $match: chunksCollMatch },
                { $group: { _id: '$shard', cnt: { $sum: 1 } } },
                { $project: { _id: 0, shard: '$_id', nChunks: '$cnt' } },
                { $sort: { shard: 1 } },
              ])
            ).toArray();

            collRes.chunkMetadata = [];

            chunks.forEach((z: any) => {
              collRes.chunkMetadata.push({
                shard: z.shard,
                nChunks: z.nChunks,
              });
            });

            for await (const chunk of (
              await chunksColl.find(chunksCollMatch)
            ).sort({ min: 1 })) {
              if (chunksRes.length < 20 || verbose) {
                const c = {
                  min: chunk.min,
                  max: chunk.max,
                  'on shard': chunk.shard,
                  'last modified': chunk.lastmod,
                } as any;
                // Displaying a full, multi-line output for each chunk is a bit verbose,
                // even if there are only a few chunks. Where supported, we use a custom
                // inspection function to inspect a copy of this object with an unlimited
                // line break length (i.e. all objects on a single line).
                Object.defineProperty(
                  c,
                  Symbol.for('nodejs.util.inspect.custom'),
                  {
                    value: function (depth: number, options: any): string {
                      return inspect(
                        { ...this },
                        { ...options, breakLength: Infinity }
                      );
                    },
                    writable: true,
                    configurable: true,
                  }
                );
                if (chunk.jumbo) c.jumbo = 'yes';
                chunksRes.push(c);
              } else if (chunksRes.length === 20 && !verbose) {
                chunksRes.push(
                  'too many chunks to print, use verbose if you want to force print'
                );
                break;
              }
            }

            const tagsRes: any[] = [];
            for await (const tag of (
              await configDB.getCollection('tags').find({
                ns: coll._id,
              })
            ).sort({ min: 1 })) {
              if (tagsRes.length < 20 || verbose) {
                tagsRes.push({
                  tag: tag.tag,
                  min: tag.min,
                  max: tag.max,
                });
              }
              if (tagsRes.length === 20 && !verbose) {
                tagsRes.push(
                  'too many tags to print, use verbose if you want to force print'
                );
                break;
              }
            }
            collRes.chunks = chunksRes;
            collRes.tags = tagsRes;
            return [coll._id, collRes] as const;
          })
        );
        return { database: db, collections: Object.fromEntries(collList) };
      })
    )
  ).filter((dbEntry) => !!dbEntry);

  delete result.shardingVersion.currentVersion;
  return result;
}

export type ShardInfo = {
  _id: string;
  host: string;
  state: number;
  tags?: string[];
  topologyTime: Timestamp;
  replSetConfigVersion: Long;
};

export type ShardingStatusResult = {
  shardingVersion: {
    _id: number;
    clusterId: ObjectId;
    /** This gets deleted when it is returned from getPrintableShardStatus */
    currentVersion?: number;
  };
  shards: ShardInfo[];
  [mongoses: `${string} mongoses`]:
    | 'none'
    | {
        [version: string]:
          | number
          | {
              up: number;
              waiting: boolean;
            };
      }[];
  autosplit: {
    'Currently enabled': 'yes' | 'no';
  };
  /** Shown if explicitly set, available and enabled by default from 7.0.0 */
  automerge?: {
    'Currently enabled': 'yes' | 'no';
  };
  balancer: {
    'Currently enabled': 'yes' | 'no';
    'Currently running': 'yes' | 'no' | 'unknown';
    'Failed balancer rounds in last 5 attempts': number;
    'Migration Results for the last 24 hours':
      | 'No recent migrations'
      | {
          [count: number]:
            | 'Success'
            | `Failed with error '${string}', from ${string} to ${string}`;
        };
    'Balancer active window is set between'?: `${string} and ${string} server local time`;
    'Last reported error'?: string;
    'Time of Reported error'?: string;
    'Collections with active migrations'?: `${string} started at ${string}`[];
  };
  shardedDataDistribution?: ShardedDataDistribution;
  databases: { database: Document; collections: Document }[];
};

export type ShardedDataDistribution = {
  ns: string;
  shards: {
    shardName: string;
    numOrphanedDocs: number;
    numOwnedDocuments: number;
    orphanedSizeBytes: number;
    ownedSizeBytes: number;
  }[];
}[];

export async function getConfigDB(db: Database): Promise<Database> {
  const helloResult = await db._maybeCachedHello();
  if (helloResult.msg !== 'isdbgrid') {
    await db._instanceState.printWarning(
      'MongoshWarning: [SHAPI-10003] You are not connected to a mongos. This command may not work as expected.'
    );
  }
  return db.getSiblingDB('config');
}

type AnyBsonNumber =
  | number
  | typeof bson.Long.prototype
  | typeof bson.Int32.prototype
  | typeof bson.Double.prototype;
export function coerceToJSNumber(n: AnyBsonNumber): number {
  if (typeof n === 'number') {
    return n;
  }
  return 'toNumber' in n ? n.toNumber() : n.valueOf();
}

export function dataFormat(bytes?: number): string {
  if (bytes === null || bytes === undefined) {
    return '0B';
  }

  if (bytes < 1024) {
    return Math.floor(bytes) + 'B';
  }
  if (bytes < 1024 * 1024) {
    return Math.floor(bytes / 1024) + 'KiB';
  }
  if (bytes < 1024 * 1024 * 1024) {
    return Math.floor((Math.floor(bytes / 1024) / 1024) * 100) / 100 + 'MiB';
  }
  return (
    Math.floor((Math.floor(bytes / (1024 * 1024)) / 1024) * 100) / 100 + 'GiB'
  );
}

export function scaleIndividualShardStatistics(
  shardStats: Document,
  scale: number
) {
  const scaledStats: Document = {};

  for (const fieldName of Object.keys(shardStats)) {
    if (
      [
        'size',
        'maxSize',
        'storageSize',
        'totalIndexSize',
        'totalSize',
      ].includes(fieldName)
    ) {
      scaledStats[fieldName] = coerceToJSNumber(shardStats[fieldName]) / scale;
    } else if (fieldName === 'scaleFactor') {
      // Explicitly change the scale factor as we removed the scaling before getting the
      // individual shards statistics. This started being returned in 4.2.
      scaledStats[fieldName] = scale;
    } else if (fieldName === 'indexSizes') {
      const scaledIndexSizes: Document = {};
      for (const indexKey of Object.keys(shardStats[fieldName])) {
        scaledIndexSizes[indexKey] =
          coerceToJSNumber(shardStats[fieldName][indexKey]) / scale;
      }
      scaledStats[fieldName] = scaledIndexSizes;
    } else {
      // All the other fields that do not require further scaling.
      scaledStats[fieldName] = shardStats[fieldName];
    }
  }

  return scaledStats;
}

export function tsToSeconds(
  x: typeof bson.Timestamp.prototype | number | { valueOf(): number }
): number {
  if (typeof x === 'object' && x && 'getHighBits' in x && 'getLowBits' in x) {
    return x.getHighBits(); // extract 't' from { t, i }
  }
  return Number(x) / 4294967296; // low 32 bits are ordinal #s within a second
}

export function addHiddenDataProperty<T = any>(
  target: T,
  key: string | symbol,
  value: any
): T {
  Object.defineProperty(target, key, {
    value,
    enumerable: false,
    writable: true,
    configurable: true,
  });
  return target;
}

export async function iterate(
  results: CursorIterationResult,
  cursor: AbstractCursor<any> | ChangeStreamCursor,
  batchSize: number
): Promise<CursorIterationResult> {
  if (cursor.isClosed()) {
    return results;
  }

  for (let i = 0; i < batchSize; i++) {
    const doc = await cursor.tryNext();
    if (doc === null) {
      results.cursorHasMore = false;
      break;
    }

    results.documents.push(doc);
  }

  return results;
}

// This is only used by collection.findAndModify() itself.
export type FindAndModifyMethodShellOptions = {
  query: Document;
  sort?: (
    | FindOneAndDeleteOptions
    | FindOneAndReplaceOptions
    | FindOneAndUpdateOptions
  )['sort'];
  update?: Document | Document[];
  remove?: boolean;
  new?: boolean;
  fields?: Document;
  projection?: Document;
  upsert?: boolean;
  bypassDocumentValidation?: boolean;
  writeConcern?: Document;
  collation?: (
    | FindOneAndDeleteOptions
    | FindOneAndReplaceOptions
    | FindOneAndUpdateOptions
  )['collation'];
  arrayFilters?: Document[];
  explain?: ExplainVerbosityLike;
};

// These are used by findOneAndUpdate + findOneAndReplace.
export type FindAndModifyShellOptions<
  BaseOptions extends FindOneAndReplaceOptions | FindOneAndUpdateOptions
> = BaseOptions & {
  returnOriginal?: boolean;
  returnNewDocument?: boolean;
  new?: boolean;
};

export function processFindAndModifyOptions<
  BaseOptions extends FindOneAndReplaceOptions | FindOneAndUpdateOptions
>(options: FindAndModifyShellOptions<BaseOptions>): BaseOptions {
  options = { ...options };
  if ('returnDocument' in options) {
    if (
      options.returnDocument !== 'before' &&
      options.returnDocument !== 'after'
    ) {
      throw new MongoshInvalidInputError(
        "returnDocument needs to be either 'before' or 'after'",
        CommonErrors.InvalidArgument
      );
    }
    delete options.returnNewDocument;
    delete options.returnOriginal;
    return options;
  }
  if ('returnOriginal' in options) {
    options.returnDocument = options.returnOriginal ? 'before' : 'after';
    delete options.returnOriginal;
    delete options.returnNewDocument;
    return options;
  }
  if ('returnNewDocument' in options) {
    options.returnDocument = options.returnNewDocument ? 'after' : 'before';
    delete options.returnOriginal;
    delete options.returnNewDocument;
    delete options.new;
    return options;
  }
  if ('new' in options) {
    options.returnDocument = options.new ? 'after' : 'before';
    delete options.returnOriginal;
    delete options.returnNewDocument;
    delete options.new;
    return options;
  }
  // No explicit option passed: We set 'returnDocument' to 'before' because the
  // default of the shell differs from the default of the browser.
  options.returnDocument = 'before';
  return options;
}

export type RemoveShellOptions = DeleteOptions & { justOne?: boolean };
export function processRemoveOptions(
  options: boolean | RemoveShellOptions
): RemoveShellOptions {
  if (typeof options === 'boolean') {
    return { justOne: options };
  }
  return { justOne: false, ...options };
}

export type MapReduceShellOptions = Document | string;
export function processMapReduceOptions(
  optionsOrOutString: MapReduceShellOptions
): MapReduceOptions {
  if (typeof optionsOrOutString === 'string') {
    return { out: optionsOrOutString } as any;
  } else if (optionsOrOutString.out === undefined) {
    throw new MongoshInvalidInputError(
      "Missing 'out' option",
      CommonErrors.InvalidArgument
    );
  } else {
    return optionsOrOutString;
  }
}

export async function setHideIndex(
  coll: Collection,
  index: string | Document,
  hidden: boolean
): Promise<Document> {
  const cmd =
    typeof index === 'string'
      ? {
          name: index,
          hidden,
        }
      : {
          keyPattern: index,
          hidden,
        };
  return await coll._database._runCommand({
    collMod: coll._name,
    index: cmd,
  });
}

export function assertCLI(platform: ReplPlatform, features: string): void {
  if (platform !== 'CLI') {
    throw new MongoshUnimplementedError(
      `${features} are not supported for current platform: ${platform}`,
      CommonErrors.NotImplemented
    );
  }
}

export function processFLEOptions(
  fleOptions: ClientSideFieldLevelEncryptionOptions
): AutoEncryptionOptions {
  assertKeysDefined(fleOptions, ['keyVaultNamespace', 'kmsProviders']);
  Object.keys(fleOptions).forEach((k) => {
    if (
      [
        'keyVaultClient',
        'keyVaultNamespace',
        'kmsProviders',
        'schemaMap',
        'bypassAutoEncryption',
        'tlsOptions',
        'bypassQueryAnalysis',
        'encryptedFieldsMap',
      ].indexOf(k) === -1
    ) {
      throw new MongoshInvalidInputError(`Unrecognized FLE Client Option ${k}`);
    }
  });
  const autoEncryption: AutoEncryptionOptions = {
    keyVaultClient: fleOptions.keyVaultClient?._serviceProvider.getRawClient(),
    keyVaultNamespace: fleOptions.keyVaultNamespace,
  };

  const localKey = fleOptions.kmsProviders.local?.key;
  if (localKey && (localKey as BinaryType)._bsontype === 'Binary') {
    const rawBuff = (localKey as BinaryType).value();
    if (Buffer.isBuffer(rawBuff)) {
      autoEncryption.kmsProviders = {
        ...fleOptions.kmsProviders,
        local: {
          key: rawBuff,
        },
      };
    } else {
      throw new MongoshInvalidInputError(
        'When specifying the key of a local KMS as BSON binary it must be constructed from a base64 encoded string'
      );
    }
  } else {
    autoEncryption.kmsProviders = {
      ...fleOptions.kmsProviders,
      // cast can go away after https://github.com/mongodb/node-mongodb-native/commit/d85f827aca56603b5d7b64f853c190473be81b6f
    } as (typeof autoEncryption)['kmsProviders'];
  }

  if (fleOptions.schemaMap) {
    autoEncryption.schemaMap = fleOptions.schemaMap;
  }
  if (fleOptions.bypassAutoEncryption !== undefined) {
    autoEncryption.bypassAutoEncryption = fleOptions.bypassAutoEncryption;
  }
  if (fleOptions.encryptedFieldsMap) {
    autoEncryption.encryptedFieldsMap = fleOptions.encryptedFieldsMap;
  }
  if (fleOptions.bypassQueryAnalysis !== undefined) {
    autoEncryption.bypassQueryAnalysis = fleOptions.bypassQueryAnalysis;
  }
  if (fleOptions.tlsOptions !== undefined) {
    autoEncryption.tlsOptions = fleOptions.tlsOptions;
  }
  return autoEncryption;
}

// The then?: never check is to make sure this doesn't accidentally get applied
// to an un-awaited Promise, which is something that the author of this function
// might have messed up while implementing this.
type NotAPromise = { [key: string]: any; then?: never };
export function maybeMarkAsExplainOutput<T extends NotAPromise>(
  value: T,
  options: ExplainOptions
): T {
  if ('explain' in options) {
    return markAsExplainOutput(value);
  }
  return value;
}

export function markAsExplainOutput<T extends NotAPromise>(value: T): T {
  if (value !== null && typeof value === 'object') {
    addHiddenDataProperty(value as any, shellApiType, 'ExplainOutput');
  }
  return value;
}

// https://docs.mongodb.com/v5.0/reference/limits/#naming-restrictions
// For db names, $ can be valid in some contexts (e.g. $external),
// so we let the server reject it if necessary.
export function isValidDatabaseName(name: string): boolean {
  return !!name && !/[/\\. "\0]/.test(name);
}

export function isValidCollectionName(name: string): boolean {
  return !!name && !/[$\0]/.test(name);
}

export function shouldRunAggregationImmediately(pipeline: Document[]): boolean {
  return pipeline.some((stage) =>
    Object.keys(stage).some(
      (stageName) => stageName === '$merge' || stageName === '$out'
    )
  );
}

function isBSONDoubleConvertible(val: any): boolean {
  return (
    (typeof val === 'number' && Number.isInteger(val)) ||
    val?._bsontype === 'Int32'
  );
}

export function adjustRunCommand(
  cmd: Document,
  shellBson: ShellBson
): Document {
  if (cmd.replSetResizeOplog !== undefined) {
    if ('size' in cmd && isBSONDoubleConvertible(cmd.size)) {
      return adjustRunCommand(
        { ...cmd, size: new shellBson.Double(+cmd.size) },
        shellBson
      );
    }
    if (
      'minRetentionHours' in cmd &&
      isBSONDoubleConvertible(cmd.minRetentionHours)
    ) {
      return adjustRunCommand(
        {
          ...cmd,
          minRetentionHours: new shellBson.Double(+cmd.minRetentionHours),
        },
        shellBson
      );
    }
  }
  if (cmd.profile !== undefined) {
    if ('sampleRate' in cmd && isBSONDoubleConvertible(cmd.sampleRate)) {
      return adjustRunCommand(
        { ...cmd, sampleRate: new shellBson.Double(+cmd.sampleRate) },
        shellBson
      );
    }
  }
  if (cmd.setParameter !== undefined && cmd.mirrorReads !== undefined) {
    if (
      'samplingRate' in cmd.mirrorReads &&
      isBSONDoubleConvertible(cmd.mirrorReads.samplingRate)
    ) {
      return adjustRunCommand(
        {
          ...cmd,
          mirrorReads: {
            ...cmd.mirrorReads,
            samplingRate: new shellBson.Double(+cmd.mirrorReads.samplingRate),
          },
        },
        shellBson
      );
    }
  }
  if (
    'configureQueryAnalyzer' in cmd &&
    isBSONDoubleConvertible(cmd.sampleRate)
  ) {
    return adjustRunCommand(
      { ...cmd, sampleRate: new shellBson.Double(+cmd.sampleRate) },
      shellBson
    );
  }
  return cmd;
}

const isFLE2Collection = (collections: Document[], index: number): boolean => {
  return (
    !collections[index].name.startsWith('enxcol_.') &&
    collections.some(
      (coll) => coll.name === `enxcol_.${collections[index].name}.esc`
    ) &&
    collections.some(
      (coll) => coll.name === `enxcol_.${collections[index].name}.ecc`
    ) &&
    collections.some(
      (coll) => coll.name === `enxcol_.${collections[index].name}.ecoc`
    )
  );
};

export function getBadge(collections: Document[], index: number): string {
  if (collections[index].type === 'timeseries') {
    return '[time-series]';
  }

  if (collections[index].type === 'view') {
    return '[view]';
  }

  if (isFLE2Collection(collections, index)) {
    return '[queryable-encryption]';
  }

  return '';
}

export function shallowClone<T>(input: T): T {
  if (!input || typeof input !== 'object') return input;
  return Array.isArray(input) ? ([...input] as unknown as T) : { ...input };
}

// Create a copy of a class so that it's constructible without `new`, i.e.
// class A {}; B = functionCtor(A);
// A() // throws
// B() // does not throw, returns instance of A
export function functionCtorWithoutProps<
  T extends Function & { new (...args: any): any }
>(ClassCtor: T): { new (...args: ConstructorParameters<T>): T } {
  function fnCtor(...args: any[]) {
    if (new.target) {
      return Reflect.construct(ClassCtor, args, new.target);
    }
    return new ClassCtor(...args);
  }
  Object.setPrototypeOf(fnCtor, Object.getPrototypeOf(ClassCtor));
  const nameDescriptor = Object.getOwnPropertyDescriptor(ClassCtor, 'name');
  if (nameDescriptor) {
    Object.defineProperty(fnCtor, 'name', nameDescriptor);
  }
  return fnCtor as any;
}

export function assignAll<T extends {}, U extends {}>(t: T, u: U): T & U;
export function assignAll<T extends {}, U extends {}, V extends {}>(
  t: T,
  u: U,
  v: V
): T & U & V;
export function assignAll<
  T extends {},
  U extends {},
  V extends {},
  W extends {}
>(t: T, u: U, v: V, w: W): T & U & V & W;
export function assignAll(target: {}, ...sources: {}[]): any {
  const newDescriptorList = [];
  for (const source of sources) {
    newDescriptorList.push(
      ...Object.entries(Object.getOwnPropertyDescriptors(source))
    );
  }
  const newDescriptorMap = Object.fromEntries(newDescriptorList);
  for (const key of Object.getOwnPropertyNames(newDescriptorMap)) {
    if (Object.getOwnPropertyDescriptor(target, key)?.configurable === false) {
      // e.g. .prototype can be written to but not re-defined
      (target as any)[key] = newDescriptorMap[key].value;
      delete newDescriptorMap[key];
    }
  }
  Object.defineProperties(target, newDescriptorMap);

  return target;
}

// pick() but account for descriptor properties and ensure that the set of passed
// keys matches the public properties of O exactly
export function pickWithExactKeyMatch<
  K extends string,
  O extends Record<K, unknown>
>(o: Record<string, never> extends Omit<O, K> ? O : never, keys: K[]): O {
  return Object.create(
    Object.getPrototypeOf(o),
    Object.fromEntries(
      Object.entries(Object.getOwnPropertyDescriptors(o)).filter(([k]) =>
        (keys as string[]).includes(k)
      )
    )
  );
}

// Take a document from config.collections and return a corresponding match filter
// for config.chunks.
// https://jira.mongodb.org/browse/MONGOSH-1179
// https://github.com/mongodb/mongo/commit/aeb430b26171d5afc55f1278a29cc0f998f6a4e1
export function buildConfigChunksCollectionMatch(
  configCollectionsInfo: Document
): Document {
  return Object.prototype.hasOwnProperty.call(
    configCollectionsInfo,
    'timestamp'
  )
    ? { uuid: configCollectionsInfo.uuid } // new format
    : { ns: configCollectionsInfo._id }; // old format
}

export const aggregateBackgroundOptionNotSupportedHelp =
  'the background option is not supported by the aggregate method and will be ignored, ' +
  'use runCommand to use { background: true } with Atlas Data Federation';

export type SearchIndexDefinition = Document;
