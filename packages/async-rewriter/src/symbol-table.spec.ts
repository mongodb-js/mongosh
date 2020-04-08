import { expect } from 'chai';
import SymbolTable from './symbol-table';
import { types } from '@mongosh/shell-api';

describe('SymbolTable', () => {
  describe('initialization', () => {
    it('types loaded', () => {
      const st = new SymbolTable(
        [{}],
        { testClass: { type: 'testClass' }, unknown: types.unknown }
      );
      expect(st.scopeAt(0)).to.deep.equal({ testClass: { lib: true, type: 'classdef', returnType: { type: 'testClass' } } });
    });
  });
});
