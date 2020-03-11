const SymbolTable = require('./lib/symbol-table').default;

const { types } = require('mongosh-shell-api');

// const AsyncWriter = require('./lib/async-writer-antlr.js').default;
const getWriter = require('./lib/async-writer-babel.js').default;

const symbols = new SymbolTable({}, types);
const writer = getWriter(symbols, types);
// writer.symbols.add('db', types.Database);
console.log(writer('x = "old value"'));
// console.log(writer.compile('db.coll.insertOne({})'));
//
// console.log(writer.compile('y = db'));
// console.log(writer.compile('y.coll.insertOne()'));
//
// console.log(writer.compile('function returnsDb() { return db; }'));
// console.log(writer.compile('returnsDb().coll.insertOne({})'));
symbols.print();

