import completer, { BASE_COMPLETIONS } from './';
import { signatures as shellSignatures, Topologies } from '@mongosh/shell-api';

import { expect } from 'chai';

let collections: string[];
let databases: string[];
const standalone600 = {
  topology: () => Topologies.Standalone,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: false,
    is_data_federation: false,
    server_version: '6.0.0',
    is_local_atlas: false,
  }),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};
const standalone440 = {
  topology: () => Topologies.Standalone,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: false,
    is_data_federation: false,
    server_version: '4.4.0',
    is_local_atlas: false,
  }),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};
const apiStrictParams = {
  topology: () => Topologies.Standalone,
  apiVersionInfo: () => ({
    version: '1',
    strict: true,
    deprecationErrors: false,
  }),
  connectionInfo: () => undefined,
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};
const sharded440 = {
  topology: () => Topologies.Sharded,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: false,
    is_data_federation: false,
    server_version: '4.4.0',
    is_local_atlas: false,
  }),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};

const standalone300 = {
  topology: () => Topologies.Standalone,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: false,
    is_data_federation: false,
    server_version: '3.0.0',
    is_local_atlas: false,
  }),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};
const datalake440 = {
  topology: () => Topologies.Sharded,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: true,
    is_data_federation: true,
    server_version: '4.4.0',
    is_local_atlas: false,
  }),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};

const localAtlas600 = {
  topology: () => Topologies.Standalone,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({
    is_atlas: false,
    is_data_federation: false,
    server_version: '6.0.0',
    is_local_atlas: true,
  }),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};

const noParams = {
  topology: () => undefined,
  apiVersionInfo: () => undefined,
  connectionInfo: () => undefined,
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};

const emptyConnectionInfoParams = {
  topology: () => Topologies.Standalone,
  apiVersionInfo: () => undefined,
  connectionInfo: () => ({}),
  getCollectionCompletionsForCurrentDb: () => collections,
  getDatabaseCompletions: () => databases,
};

describe('completer.completer', function () {
  beforeEach(function () {
    collections = [];
  });

  it('returns case-insensitive results', async function () {
    const input = 'db.getr';
    const [completions] = await completer(noParams as any, input);
    expect(completions).to.deep.eq([
      'db.getRole',
      'db.getRoles',
      'db.getReplicationInfo',
    ]);
  });

  context('when context is top level shell api', function () {
    it('matches shell completions', async function () {
      const i = 'u';
      expect(await completer(standalone440, i)).to.deep.equal([['use'], i]);
    });

    it('does not have a match', async function () {
      const i = 'ad';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('is an exact match to one of shell completions', async function () {
      const i = 'use';
      expect(await completer(standalone440, i)).to.deep.equal([
        [],
        i,
        'exclusive',
      ]);
    });
  });

  [
    { params: noParams, label: 'no version' },
    { params: emptyConnectionInfoParams, label: 'empty connection info' },
  ].forEach(({ params, label }) => {
    context(`when ${label} is passed to completer`, function () {
      it('matches all db completions', async function () {
        const i = 'db.';
        const c = await completer(params as any, i);
        expect(c.length).to.equal(2);
        expect(c[1]).to.equal(i);
        expect(c[0]).to.include.members([
          'db.getMongo',
          'db.getName',
          'db.getCollectionNames',
          'db.getCollectionInfos',
          'db.runCommand',
          'db.adminCommand',
          'db.aggregate',
          'db.getSiblingDB',
          'db.getCollection',
          'db.dropDatabase',
          'db.createUser',
          'db.updateUser',
          'db.changeUserPassword',
          'db.logout',
          'db.dropUser',
          'db.dropAllUsers',
          'db.auth',
          'db.grantRolesToUser',
          'db.revokeRolesFromUser',
          'db.getUser',
          'db.getUsers',
          'db.createCollection',
          'db.createView',
          'db.createRole',
          'db.updateRole',
          'db.dropRole',
          'db.dropAllRoles',
          'db.grantRolesToRole',
          'db.revokeRolesFromRole',
          'db.grantPrivilegesToRole',
          'db.revokePrivilegesFromRole',
          'db.getRole',
          'db.getRoles',
        ]);
      });

      it('does not have a match', async function () {
        const i = 'db.shipwrecks.aggregate([ { $so';
        expect(await completer(noParams, i)).to.deep.equal([
          [
            'db.shipwrecks.aggregate([ { $sortArray',
            'db.shipwrecks.aggregate([ { $sort',
            'db.shipwrecks.aggregate([ { $sortByCount',
          ],
          i,
        ]);
      });

      it('is an exact match to one of shell completions', async function () {
        const i = 'db.bios.find({ field: { $exis';
        expect(await completer(noParams, i)).to.deep.equal([
          ['db.bios.find({ field: { $exists'],
          i,
        ]);
      });
    });
  });

  context('datalake features', function () {
    let origBaseCompletions: any[];
    beforeEach(function () {
      // Undo https://github.com/mongodb-js/ace-autocompleter/pull/65 for testing
      // because it's the only DataLake-only feature.
      origBaseCompletions = [...BASE_COMPLETIONS];
      (BASE_COMPLETIONS as any).push({
        name: '$sql',
        value: '$sql',
        label: '$sql',
        score: 1,
        env: ['adl'],
        meta: 'stage',
        version: '4.0.0',
      });
    });
    afterEach(function () {
      BASE_COMPLETIONS.splice(
        0,
        BASE_COMPLETIONS.length,
        ...origBaseCompletions
      );
    });

    it('includes them when not connected', async function () {
      const i = 'db.shipwrecks.aggregate([ { $sq';
      expect(await completer(noParams, i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([ { $sqrt',
          'db.shipwrecks.aggregate([ { $sql',
        ],
        i,
      ]);
    });

    it('includes them when connected to DataLake', async function () {
      const i = 'db.shipwrecks.aggregate([ { $sq';
      expect(await completer(datalake440, i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([ { $sqrt',
          'db.shipwrecks.aggregate([ { $sql',
        ],
        i,
      ]);
    });

    it('does not include them when connected to a standalone node', async function () {
      const i = 'db.shipwrecks.aggregate([ { $sq';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks.aggregate([ { $sqrt'],
        i,
      ]);
    });
  });

  context('local atlas', function () {
    it('includes them when connected to local atlas', async function () {
      const i = 'db.shipwrecks.aggregate([ { $sea';
      expect(await completer(localAtlas600, i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([ { $search',
          'db.shipwrecks.aggregate([ { $searchMeta',
        ],
        i,
      ]);
    });
  });

  context('when context is top level db', function () {
    // this should eventually encompass tests for DATABASE commands and
    // COLLECTION names.
    // for now, this will only return the current input.
    it('matches a database command', async function () {
      const i = 'db.agg';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.aggregate'],
        i,
      ]);
    });

    it('returns all suggestions', async function () {
      const i = 'db.';
      const attr = shellSignatures.Database.attributes as any;
      const dbComplete = Object.keys(attr);
      const adjusted = dbComplete
        .filter((c) => !attr[c].deprecated)
        .map((c) => `${i}${c}`);
      expect(await completer(noParams, i)).to.deep.equal([adjusted, i]);
    });

    it('matches several suggestions', async function () {
      const i = 'db.get';
      expect((await completer(standalone440, i))[0]).to.include.members([
        'db.getCollectionNames',
        'db.getCollection',
        'db.getCollectionInfos',
        'db.getSiblingDB',
      ]);
    });

    it('returns current input and no suggestions', async function () {
      const i = 'db.shipw';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('includes collection names', async function () {
      collections = ['shipwrecks'];
      const i = 'db.shipw';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks'],
        i,
      ]);
    });
  });

  context('when context is collections', function () {
    it('matches a collection command', async function () {
      const i = 'db.shipwrecks.findOneAndUp';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks.findOneAndUpdate'],
        i,
      ]);
    });

    it('matches a collection command if part of an expression', async function () {
      const i = 'var result = db.shipwrecks.findOneAndUp';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['var result = db.shipwrecks.findOneAndUpdate'],
        i,
      ]);
    });

    it('returns all suggestions', async function () {
      const i = 'db.shipwrecks.';
      const collComplete = Object.keys(
        shellSignatures.Collection.attributes as any
      );
      const adjusted = collComplete
        .filter(
          (c) =>
            ![
              'count',
              'update',
              'remove',
              'insert',
              'save',
              'findAndModify',
              'reIndex',
              'mapReduce',
              // 6.0+
              'getSearchIndexes',
              'createSearchIndex',
              'createSearchIndexes',
              'dropSearchIndex',
              'updateSearchIndex',
              // 7.0+
              'checkMetadataConsistency',
              'analyzeShardKey',
              'configureQueryAnalyzer',
            ].includes(c)
        )
        .map((c) => `${i}${c}`);

      expect(await completer(sharded440, i)).to.deep.equal([adjusted, i]);
    });

    it('matches several collection commands', async function () {
      const i = 'db.shipwrecks.find';
      expect(await completer(standalone440, i)).to.deep.equal([
        [
          'db.shipwrecks.find',
          'db.shipwrecks.findOne',
          'db.shipwrecks.findOneAndDelete',
          'db.shipwrecks.findOneAndReplace',
          'db.shipwrecks.findOneAndUpdate',
        ],
        i,
      ]);
    });

    it('does not have a match', async function () {
      const i = 'db.shipwrecks.pr';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('does not provide anything if there is a function call instead of a collection name', async function () {
      const i = 'db.getMongo().find';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('provides results if the function call is getCollection', async function () {
      const i = 'db.getCollection("foo").find';
      expect((await completer(standalone440, i))[0].length).to.be.greaterThan(
        1
      );
    });
  });

  context('when context is collections and aggregation cursor', function () {
    it('matches an aggregation cursor command', async function () {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).has';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).hasNext'],
        i,
      ]);
    });

    it('returns all suggestions', async function () {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).';
      const aggCursorComplete = Object.keys(
        shellSignatures.AggregationCursor.attributes as any
      );
      const adjusted = aggCursorComplete.map((c) => `${i}${c}`);

      expect(await completer(standalone440, i)).to.deep.equal([adjusted, i]);
    });

    it('does not have a match', async function () {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).w';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('has several matches', async function () {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).i';
      expect(await completer(standalone440, i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).isClosed',
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).isExhausted',
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).itcount',
        ],
        i,
      ]);
    });
  });

  context('when context is db aggregation query', function () {
    it('has several matches for db level stages', async function () {
      const query = 'db.aggregate([{';
      expect(await completer(standalone440, query)).to.deep.equal([
        [
          'db.aggregate([{$changeStream',
          'db.aggregate([{$currentOp',
          'db.aggregate([{$listLocalSessions',
        ],
        query,
      ]);
      expect(await completer(standalone600, query)).to.deep.equal([
        [
          'db.aggregate([{$changeStream',
          'db.aggregate([{$currentOp',
          'db.aggregate([{$documents',
          'db.aggregate([{$listLocalSessions',
        ],
        query,
      ]);
    });

    it('does not have a match', async function () {
      const query = 'db.aggregate([{$mat';
      expect(await completer(standalone440, query)).to.deep.equal([[], query]);
    });

    it('matches a db aggregation stage', async function () {
      const query = 'db.aggregate([{$lis';
      expect(await completer(standalone440, query)).to.deep.equal([
        ['db.aggregate([{$listLocalSessions'],
        query,
      ]);
    });

    it('completes the followup stages', async function () {
      const query = 'db.aggregate([{$currentOp: {}}, {$ma';
      expect(await completer(standalone440, query)).to.deep.equal([
        [
          'db.aggregate([{$currentOp: {}}, {$map',
          'db.aggregate([{$currentOp: {}}, {$match',
        ],
        query,
      ]);
    });
  });

  context('when context is aggregation query', function () {
    it('has several matches', async function () {
      const i = 'db.shipwrecks.aggregate([ { $so';
      expect(await completer(standalone440, i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([ { $sort',
          'db.shipwrecks.aggregate([ { $sortByCount',
        ],
        i,
      ]);
    });

    it('does not have a match', async function () {
      const i = 'db.shipwrecks.aggregate([ { $cat';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('matches an aggregation stage', async function () {
      const i = 'db.shipwrecks.aggregate([ { $proj';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks.aggregate([ { $project'],
        i,
      ]);
    });

    it('does not fail when the server_version is not specified', async function () {
      const i = 'db.shipwrecks.aggregate([ { $proj';
      expect(
        await completer(emptyConnectionInfoParams as any, i)
      ).to.deep.equal([['db.shipwrecks.aggregate([ { $project'], i]);
    });
  });

  context('when context is a collection query', function () {
    it('returns all suggestions', async function () {
      const i = 'db.shipwrecks.find({ ';
      expect((await completer(standalone440, i))[0]).to.include.members([
        'db.shipwrecks.find({ $all',
        'db.shipwrecks.find({ $and',
        'db.shipwrecks.find({ $bitsAllClear',
        'db.shipwrecks.find({ $bitsAllSet',
        'db.shipwrecks.find({ $bitsAnyClear',
        'db.shipwrecks.find({ $bitsAnySet',
        'db.shipwrecks.find({ $comment',
        'db.shipwrecks.find({ $elemMatch',
        'db.shipwrecks.find({ $eq',
        'db.shipwrecks.find({ $exists',
        'db.shipwrecks.find({ $expr',
        'db.shipwrecks.find({ $geoIntersects',
        'db.shipwrecks.find({ $geoWithin',
        'db.shipwrecks.find({ $gt',
        'db.shipwrecks.find({ $gte',
        'db.shipwrecks.find({ $in',
        'db.shipwrecks.find({ $jsonSchema',
        'db.shipwrecks.find({ $lt',
        'db.shipwrecks.find({ $lte',
        'db.shipwrecks.find({ $mod',
        'db.shipwrecks.find({ $ne',
        'db.shipwrecks.find({ $near',
        'db.shipwrecks.find({ $nearSphere',
        'db.shipwrecks.find({ $nin',
        'db.shipwrecks.find({ $not',
        'db.shipwrecks.find({ $nor',
        'db.shipwrecks.find({ $or',
        'db.shipwrecks.find({ $regex',
        'db.shipwrecks.find({ $size',
        'db.shipwrecks.find({ $slice',
        'db.shipwrecks.find({ $text',
        'db.shipwrecks.find({ $type',
        'db.shipwrecks.find({ $where',
        'db.shipwrecks.find({ Code',
        'db.shipwrecks.find({ ObjectId',
        'db.shipwrecks.find({ Binary',
        'db.shipwrecks.find({ DBRef',
        'db.shipwrecks.find({ Timestamp',
        'db.shipwrecks.find({ NumberInt',
        'db.shipwrecks.find({ NumberLong',
        'db.shipwrecks.find({ NumberDecimal',
        'db.shipwrecks.find({ MaxKey',
        'db.shipwrecks.find({ MinKey',
        'db.shipwrecks.find({ ISODate',
        'db.shipwrecks.find({ RegExp',
      ]);
    });

    it('has several matches', async function () {
      const i = 'db.bios.find({ birth: { $g';
      expect(await completer(standalone440, i)).to.deep.equal([
        [
          'db.bios.find({ birth: { $geoIntersects',
          'db.bios.find({ birth: { $geoWithin',
          'db.bios.find({ birth: { $gt',
          'db.bios.find({ birth: { $gte',
        ],
        i,
      ]);
    });

    it('does not have a match', async function () {
      const i = 'db.bios.find({ field: { $cat';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('matches an aggregation stage', async function () {
      const i = 'db.bios.find({ field: { $exis';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.bios.find({ field: { $exists'],
        i,
      ]);
    });
  });

  context('when context is collections and collection cursor', function () {
    it('matches a collection cursor command', async function () {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).for';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks.find({feature_type: "Wrecks - Visible"}).forEach'],
        i,
      ]);
    });

    it('returns all suggestions running on 4.4.0 version', async function () {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).';

      const result = [
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).allowPartialResults',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).batchSize',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).close',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).collation',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).comment',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).explain',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).forEach',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).hasNext',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).hint',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).isClosed',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).isExhausted',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).itcount',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).limit',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).map',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).max',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).maxTimeMS',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).maxAwaitTimeMS',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).min',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).next',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).noCursorTimeout',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).oplogReplay',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).projection',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).readPref',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).returnKey',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).size',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).skip',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).sort',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).tailable',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).toArray',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).pretty',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).showRecordId',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).objsLeftInBatch',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).readConcern',
      ];

      expect((await completer(standalone440, i))[0]).to.include.members(result);
    });

    it('returns all suggestions matching 3.0.0 version', async function () {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).';

      const result = [
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).addOption',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).allowPartialResults',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).batchSize',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).close',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).explain',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).forEach',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).hasNext',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).hint',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).isClosed',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).isExhausted',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).itcount',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).limit',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).map',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).max',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).maxTimeMS',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).min',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).next',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).noCursorTimeout',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).oplogReplay',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).projection',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).readPref',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).size',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).skip',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).sort',
        'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).toArray',
      ];

      expect((await completer(standalone300, i))[0]).to.include.members(result);
    });

    it('does not have a match', async function () {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).gre';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });

    it('has several matches', async function () {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).cl';
      expect(await completer(standalone440, i)).to.deep.equal([
        ['db.shipwrecks.find({feature_type: "Wrecks - Visible"}).close'],
        i,
      ]);
    });

    it('does not match if it is not .find or .aggregate', async function () {
      const i = 'db.shipwrecks.moo({feature_type: "Wrecks - Visible"}).';
      expect(await completer(standalone440, i)).to.deep.equal([[], i]);
    });
  });

  context('for shell commands', function () {
    it('completes partial commands (sho)', async function () {
      const i = 'sho';
      expect(await completer(noParams, i)).to.deep.equal([['show'], i]);
    });

    it('completes partial commands (show)', async function () {
      const i = 'show';
      const result = await completer(noParams, i);
      expect(result[0]).to.contain('show databases');
    });

    it('completes show databases', async function () {
      const i = 'show d';
      expect(await completer(noParams, i)).to.deep.equal([
        ['show databases'],
        i,
        'exclusive',
      ]);
    });

    it('completes show profile', async function () {
      const i = 'show pr';
      expect(await completer(noParams, i)).to.deep.equal([
        ['show profile'],
        i,
        'exclusive',
      ]);
    });

    it('completes use db with no space', async function () {
      databases = ['db1', 'db2'];
      const i = 'use';
      expect(await completer(noParams, i)).to.deep.equal([
        ['use db1', 'use db2'],
        i,
        'exclusive',
      ]);
    });

    it('completes use db with a space', async function () {
      databases = ['db1', 'db2'];
      const i = 'use ';
      expect(await completer(noParams, i)).to.deep.equal([
        ['use db1', 'use db2'],
        i,
        'exclusive',
      ]);
    });

    it('completes use db with single database and no space', async function () {
      databases = ['db1'];
      const i = 'use';
      expect(await completer(noParams, i)).to.deep.equal([
        ['use db1'],
        i,
        'exclusive',
      ]);
    });

    it('completes use db with single database and space', async function () {
      databases = ['db1'];
      const i = 'use ';
      expect(await completer(noParams, i)).to.deep.equal([
        ['use db1'],
        i,
        'exclusive',
      ]);
    });

    it('does not try to complete over-long commands', async function () {
      databases = ['db1', 'db2'];
      const i = 'use db1 d';
      expect(await completer(noParams, i)).to.deep.equal([[], i, 'exclusive']);
    });

    it('completes commands like exit', async function () {
      const i = 'exi';
      expect(await completer(noParams, i)).to.deep.equal([['exit'], i]);
    });

    it('completes with multiple spaces', async function () {
      const i = 'show  datab';
      expect(await completer(noParams, i)).to.deep.equal([
        ['show  databases'],
        i,
        'exclusive',
      ]);
    });
  });

  context('with apiStrict', function () {
    it('completes supported methods like db.test.findOneAndReplace', async function () {
      const i = 'db.test.findOneAndR';
      expect(await completer(apiStrictParams, i)).to.deep.equal([
        ['db.test.findOneAndReplace'],
        i,
      ]);
    });

    it('completes common methods like db.test.getName', async function () {
      const i = 'db.test.getNam';
      expect(await completer(apiStrictParams, i)).to.deep.equal([
        ['db.test.getName'],
        i,
      ]);
    });

    it('does not complete unsupported methods like db.test.renameCollection', async function () {
      const i = 'db.test.renameC';
      expect(await completer(apiStrictParams, i)).to.deep.equal([[], i]);
    });

    it('completes supported aggregation stages', async function () {
      const i = 'db.test.aggregate([{$mat';
      expect(await completer(apiStrictParams, i)).to.deep.equal([
        ['db.test.aggregate([{$match'],
        i,
      ]);
    });

    it('does not complete unsupported aggregation stages', async function () {
      const i = 'db.test.aggregate([{$indexSta';
      expect(await completer(apiStrictParams, i)).to.deep.equal([[], i]);
    });
  });

  context('with stream processing sp', function () {
    it('completes supported methods sp.listStreamProcessor', async function () {
      const i = 'sp.listS';
      expect(await completer(apiStrictParams, i)).to.deep.equal([
        ['sp.listStreamProcessors'],
        i,
      ]);
    });

    it('completes methods on processors like sp.name.drop', async function () {
      const i = 'sp.processorName.d';
      expect(await completer(apiStrictParams, i)).to.deep.equal([
        ['sp.processorName.drop'],
        i,
      ]);
    });
  });
});
