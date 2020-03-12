const SymbolTable = require('./lib/symbol-table').default;
const getWriter = require('./lib/async-writer-babel.js').default;

const { types } = require('mongosh-shell-api');


// const AsyncWriter = require('./lib/async-writer-antlr.js').default;

const symbols = new SymbolTable({ db: types.Database }, types);
const writer = getWriter(symbols, types);
const input = 'db.coll.insertOne()';
console.log(`"${input}" ==> "${writer(input)}"`);
// console.log(writer.compile('db.coll.insertOne({})'));
//
// console.log(writer.compile('y = db'));
// console.log(writer.compile('y.coll.insertOne()'));
//
// console.log(writer.compile('function returnsDb() { return db; }'));
// console.log(writer.compile('returnsDb().coll.insertOne({})'));
// symbols.print();

