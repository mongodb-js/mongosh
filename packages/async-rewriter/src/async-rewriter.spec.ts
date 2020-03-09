import { expect } from 'chai';
import compile, { SymbolTable } from './async-rewriter';
import { types } from 'mongosh-shell-api';

describe('Async rewrite', () => {
  it('passes', () => {
    expect(compile('db', types, new SymbolTable({}))).to.equal('db');
  });
});
