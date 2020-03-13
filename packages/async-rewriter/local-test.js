/* eslint no-console:0 */
const SymbolTable = require('./lib/symbol-table').default;
const getWriter = require('./lib/async-writer-babel.js').default;

const { types } = require('mongosh-shell-api');

const symbols = new SymbolTable({ db: types.Database }, types);
const writer = getWriter(symbols);
const input = [
  'db.coll.insertOne()',
  'y = db',
  'y.coll.insertOne()',
  '() => {return db; 1}',
  'f = () => {return db; 1}',
  'function x() {return db;}',
  'x().coll.insertOne()'
];

input.forEach((i) => console.log(`"${i}" ==> "${writer(i)}"`));
symbols.print();

