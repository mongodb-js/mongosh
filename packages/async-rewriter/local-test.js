const { types } = require('mongosh-shell-api');

const AsyncWriter = require('./lib/async-writer.js').default;

const writer = new AsyncWriter(types);
writer.symbols.add('db', types.Database);
console.log(writer.compile('db.coll.insertOne({})'));

console.log(writer.compile('y = db'));
console.log(writer.compile('y.coll.insertOne()'));

console.log(writer.compile('function returnsDb() { return db; }'));
console.log(writer.compile('returnsDb().coll.insertOne({})'));
writer.symbols.print();
