/* eslint no-console:0 */
const SymbolTable = require('./lib/symbol-table').default;
const AsyncWriter = require('./lib/async-writer-babel.js').default;

const { types } = require('@mongosh/shell-api');

const writer = new AsyncWriter({ db: types.Database }, types);
const input = [
  'db.coll.insertOne()',
  'y = db',
  'y.coll.insertOne()',
  '() => {return db; 1}',
  'f = () => {return db; 1}',
  'function x() {return db;}',
  'x().coll.insertOne()'
];

input.forEach((i) => console.log(`"${i}" ==> "${writer.compile(i)}"`));
writer.symbols.print();

