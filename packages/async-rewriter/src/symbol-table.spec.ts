import { expect } from 'chai';
import SymbolTable from './symbol-table';

describe('SymbolTable', () => {
  describe('initialization', () => {
    it('types loaded', () => {
      const st = new SymbolTable(
        [{}],
        { testClass: { type: 'testClass' } }
      );
      expect(st.scopeAt(0)).to.deep.equal({ testClass: { type: 'classdef', returnType: { type: 'testClass' } } });
    });
  });
});
