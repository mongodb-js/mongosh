/* eslint no-console:0 */
const SymbolTable = require('./lib/symbol-table').default;
const AsyncWriter = require('./lib/async-writer-babel.js').default;

const { types } = require('@mongosh/shell-api');

const empty_types = { unknown: types.unknown };

const sinon = require('sinon');

const scope = [
  { x: { type: 'function', returnsPromise: true, returnType: { type: 'new' } } },
  { db: types.Database }
];

// const st = new SymbolTable(scope[1], empty_types);
// const spy = sinon.spy(st);
const writer = new AsyncWriter(scope[1], types);
const input = [
//   `
// a = db.coll1;
// if (TEST) {
//   a = db.coll2;
// }
// `,
//   'var a = 1;'
  '{ const x = db; }'
];

input.forEach((i) => console.log(`${i}\n======> \n${writer.compile(i)}`));
writer.symbols.print();

// console.log(spy.add.getCalls());
