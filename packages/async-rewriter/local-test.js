const { types } = require('mongosh-shell-api');

const compile = require('./lib/compile.js').default;
const SymbolTable = require('./lib/symbol-table.js').default;

const symbols = new SymbolTable({ db: types.Database }, types);
// console.log(compile('db.coll.insertOne({})', types, symbols));
//
// console.log(compile('y = db', types, symbols));
// console.log(compile('y.coll.insertOne()', types, symbols));
//
console.log(compile('function returnsDb() { return db; }', types, symbols));
console.log(compile('returnsDb().coll.insertOne({})', types, symbols));
symbols.print();
