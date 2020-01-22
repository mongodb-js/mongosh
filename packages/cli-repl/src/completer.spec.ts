import completer from './completer';
import { types as shellTypes } from 'mongosh-shell-api';

import { expect } from 'chai';

describe('completer.completer', () => {
  context('when context is top level shell api', () => {
    it('matches shell completions', () => {
      const i = 'u';
      expect(completer(i)).to.deep.equal([['use'], i]);
    });

    it('does not have a match', () => {
      const i = 'ad';
      expect(completer(i)).to.deep.equal([[], i]);
    });

    it('is an exact match to one of shell completions', () => {
      const i = 'use';
      expect(completer(i)).to.deep.equal([[i], i]);
    });
  });

  context('when context is top level db', () => {
    // this should eventually encompass tests for DATABSE commands and
    // COLLECTION names.
    // for now, this will only return the current inpput.

    it('returns current input and no suggestions', () => {
      const i = 'db.shipw';
      expect(completer(i)).to.deep.equal([[], i]);
    });
  });

  context('when context is collections', () => {
    it('matches a collection command', () => {
      const i = 'db.shipwrecks.findAnd';
      expect(completer(i)).to.deep.equal([['db.shipwrecks.findAndModify'], i]);
    });

    it('returns all suggestions', () => {
      const i = 'db.shipwrecks.';
      const collComplete = Object.keys(shellTypes.Collection.attributes)
      const adjusted = collComplete.map(c => `${i}${c}`)

      expect(completer(i)).to.deep.equal([adjusted, i]);
    });

    it('matches several collection commands', () => {
      const i = 'db.shipwrecks.find';
      expect(completer(i)).to.deep.equal([
        [
          'db.shipwrecks.find', 'db.shipwrecks.findAndModify',
          'db.shipwrecks.findOne', 'db.shipwrecks.findOneAndDelete',
          'db.shipwrecks.findOneAndReplace', 'db.shipwrecks.findOneAndUpdate'
        ], i]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.pr';
      expect(completer(i)).to.deep.equal([[], i]);
    });
  });

  context('when context is collections and aggregation cursor', () => {
    it('matches an aggregation cursor command', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).has';
      expect(completer(i)).to.deep.equal([
        ['db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).hasNext'], i]);
    });

    it('returns all suggestions', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).';
      const aggCursorComplete = Object.keys(shellTypes.AggregationCursor.attributes)
      const adjusted = aggCursorComplete.map(c => `${i}${c}`)

      expect(completer(i)).to.deep.equal([adjusted, i]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).w';
      expect(completer(i)).to.deep.equal([[], i]);
    });

    it('has several matches', () => {
      const i = 'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).i';
      expect(completer(i)).to.deep.equal([
        [
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).isClosed',
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).isExhausted',
          'db.shipwrecks.aggregate([{$sort: {feature_type: 1}}]).itcount'
        ], i]);
    });
  });

  context('when context is collections and collection cursor', () => {
    it('matches a collection cursor command', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).for';
      expect(completer(i)).to.deep.equal([
        ['db.shipwrecks.find({feature_type: "Wrecks - Visible"}).forEach'], i]);
    });

    it('returns all suggestions', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).';
      const collCursorComplete = Object.keys(shellTypes.Cursor.attributes);
      const adjusted = collCursorComplete.map(c => `${i}${c}`)

      expect(completer(i)).to.deep.equal([adjusted, i]);
    });

    it('does not have a match', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).gre';
      expect(completer(i)).to.deep.equal([[], i]);
    });

    it('has several matches', () => {
      const i = 'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).cl';
      expect(completer(i)).to.deep.equal([
        [
          'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).clone',
          'db.shipwrecks.find({feature_type: "Wrecks - Visible"}).close'
        ], i]);
    });
  });
});
