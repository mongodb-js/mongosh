import completer from './completer';
import { signatures as shellSignatures } from '@mongosh/shell-api';

import { expect } from 'chai';

describe('completer.completer', () => {
  context('when context is top level shell api', () => {
    it('matches shell completions', () => {
      const i = 'u';
      expect(completer('4.4.0', i)).to.deep.equal([['use'], i]);
    });

    it('does not have a match', () => {
      const i = 'ad';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });

    it('is an exact match to one of shell completions', () => {
      const i = 'use';
      expect(completer('4.4.0', i)).to.deep.equal([[i], i]);
    });
  });

  context('when no version is passed to completer', () => {
    it('matches all db completions', () => {
      const i = 'db.';
      const c = completer(undefined, i);
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
        'db.getRoles'
      ]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.aggregate([ { $so';
      expect(completer(undefined, i)).to.deep.equal([
        ['db.shipwrecks.aggregate([ { $sort',
          'db.shipwrecks.aggregate([ { $sortByCount'], i]);
    });

    it('is an exact match to one of shell completions', () => {
      const i = 'db.bios.find({ field: { $exis';
      expect(completer(undefined, i))
        .to.deep.equal([['db.bios.find({ field: { $exists'], i]);
    });
  });

  context('when context is top level db', () => {
    // this should eventually encompass tests for DATABASE commands and
    // COLLECTION names.
    // for now, this will only return the current input.
    it('matches a database command', () => {
      const i = 'db.agg';
      expect(completer('4.4.0', i)).to.deep.equal([['db.aggregate'], i]);
    });

    it('returns all suggestions', () => {
      const i = 'db.';
      const dbComplete = Object.keys(shellSignatures.Database.attributes);
      const adjusted = dbComplete.map(c => `${i}${c}`);
      expect(completer('4.4.0', i)).to.deep.equal([adjusted, i]);
    });

    it('matches several suggestions', () => {
      const i = 'db.get';
      expect(completer('4.4.0', i)[0]).to.include.members(
        [
          'db.getCollectionNames',
          'db.getCollection',
          'db.getCollectionInfos',
          'db.getSiblingDB'
        ]);
    });

    it('returns current input and no suggestions', () => {
      const i = 'db.shipw';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });
  });

  context('when context is collections', () => {
    it('matches a collection command', () => {
      const i = 'db.shipwrecks.findAnd';
      expect(completer('4.4.0', i)).to.deep.equal([['db.shipwrecks.findAndModify'], i]);
    });

    it('matches a collection command if part of an expression', () => {
      const i = 'var result = db.shipwrecks.findAnd';
      expect(completer('4.4.0', i)).to.deep.equal([['var result = db.shipwrecks.findAndModify'], i]);
    });

    it('returns all suggestions', () => {
      const i = 'db.shipwrecks.';
      const collComplete = Object.keys(shellSignatures.Collection.attributes);
      const adjusted = collComplete.filter(c => !['count', 'update', 'save', 'remove'].includes(c)).map(c => `${i}${c}`);

      expect(completer('4.4.0', i)).to.deep.equal([adjusted, i]);
    });

    it('matches several collection commands', () => {
      const i = 'db.shipwrecks.find';
      expect(completer('4.4.0', i)).to.deep.equal([
        [
          'db.shipwrecks.find', 'db.shipwrecks.findAndModify',
          'db.shipwrecks.findOne', 'db.shipwrecks.findOneAndDelete',
          'db.shipwrecks.findOneAndReplace', 'db.shipwrecks.findOneAndUpdate'
        ], i]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.pr';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });
  });

  context('when context is collections and aggregation cursor', () => {
    it('matches an aggregation cursor command', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).has';
      expect(completer('4.4.0', i)).to.deep.equal([
        ['db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).hasNext'], i]);
    });

    it('returns all suggestions', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).';
      const aggCursorComplete = Object.keys(shellSignatures.AggregationCursor.attributes);
      const adjusted = aggCursorComplete.map(c => `${i}${c}`);

      expect(completer('4.4.0', i)).to.deep.equal([adjusted, i]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).w';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });

    it('has several matches', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).i';
      expect(completer('4.4.0', i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).isClosed',
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).isExhausted',
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).itcount'
        ], i]);
    });
  });

  context('when context is aggregation query', () => {
    it('has several matches', () => {
      const i = 'db.shipwrecks.aggregate([ { $so';
      expect(completer('4.4.0', i)).to.deep.equal([
        ['db.shipwrecks.aggregate([ { $sort',
          'db.shipwrecks.aggregate([ { $sortByCount'], i]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.aggregate([ { $cat';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });

    it('matches an aggregation stage', () => {
      const i = 'db.shipwrecks.aggregate([ { $proj';
      expect(completer('4.4.0', i)).to.deep.equal([
        [ 'db.shipwrecks.aggregate([ { $project' ], i]);
    });
  });

  context('when context is a collection query', () => {
    it('returns all suggestions', () => {
      const i = 'db.shipwrecks.find({ ';
      expect(completer('4.4.0', i)[0]).to.include.members(
        [ 'db.shipwrecks.find({ $all',
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
          'db.shipwrecks.find({ RegExp' ]);
    });

    it('has several matches', () => {
      const i = 'db.bios.find({ birth: { $g';
      expect(completer('4.4.0', i)).to.deep.equal([
        [
          'db.bios.find({ birth: { $geoIntersects',
          'db.bios.find({ birth: { $geoWithin',
          'db.bios.find({ birth: { $gt',
          'db.bios.find({ birth: { $gte',
        ], i]);
    });

    it('does not have a match', () => {
      const i = 'db.bios.find({ field: { $cat';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });

    it('matches an aggregation stage', () => {
      const i = 'db.bios.find({ field: { $exis';
      expect(completer('4.4.0', i)).to.deep.equal([
        [ 'db.bios.find({ field: { $exists' ], i]);
    });
  });

  context('when context is collections and collection cursor', () => {
    it('matches a collection cursor command', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).for';
      expect(completer('4.4.0', i)).to.deep.equal([
        ['db.shipwrecks.find({feature_type: "Wrecks - Visible"}).forEach'], i]);
    });

    it('returns all suggestions running on 4.4.0 version', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).';

      const result = [
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).allowPartialResults',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).batchSize',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).clone',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).close',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).collation',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).comment',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).count',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).explain',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).forEach',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).hasNext',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).hint',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).isClosed',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).isExhausted',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).itcount',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).limit',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).map',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).max',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).maxTimeMS',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).min',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).next',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).noCursorTimeout',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).oplogReplay',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).projection',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).readPref',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).returnKey',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).size',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).skip',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).sort',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).tailable',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).toArray',
      ];

      expect(completer('4.4.0', i)[0]).to.include.members(result);
    });

    it('returns all suggestions matching 3.0.0 version', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).';

      const result = [
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).addOption',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).allowPartialResults',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).batchSize',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).clone',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).close',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).count',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).explain',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).forEach',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).hasNext',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).hint',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).isClosed',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).isExhausted',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).itcount',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).limit',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).map',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).max',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).maxTimeMS',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).min',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).next',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).noCursorTimeout',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).oplogReplay',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).projection',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).readPref',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).size',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).skip',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).sort',
        'db.shipwrecks.find({feature_type: \"Wrecks - Visible\"}).toArray',
      ];

      expect(completer('3.0.0', i)[0]).to.include.members(result);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).gre';
      expect(completer('4.4.0', i)).to.deep.equal([[], i]);
    });

    it('has several matches', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).cl';
      expect(completer('4.4.0', i)).to.deep.equal([
        [
          'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).clone',
          'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).close'
        ], i]);
    });
  });
});
