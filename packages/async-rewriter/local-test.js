/* eslint no-console:0 */
const SymbolTable = require('./lib/symbol-table').default;
const AsyncWriter = require('./lib/async-writer-babel.js').default;

const { types } = require('mongosh-shell-api');

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
  // 'db.coll.insertOne()',
  // 'y = db',
  // 'var x = db;'
  // 'y.coll.insertOne()',
  // '() => {return db;}',
  // '() => {db;}',
  // 'function x() { db.coll.insertOne({}) }',
  // 'x(abc);'
  // '() => (db)',
  // 'function x() {return db;}',
  // 'x().coll.insertOne()',
  // 'f().coll.insertOne()',
  // 'db.coll[x()]',
  // 'x(x(1))'
  // `function fn() {
  //   if (x) {
  //     return 1;
  //   } else {
  //     return 1;
  //   }
  // }`,
  `class Test {
    constructor() {}
    fn() { return db; }
  }`,
  'x = new Test()'
];

input.forEach((i) => console.log(`"${i}" ==> "${writer.compile(i)}"`));
writer.symbols.print();

// console.log(spy.add.getCalls());
