// before
db.coll.remove({});
db.coll.insert({category: "cat1", v: 1});
db.coll.insert({category: "cat2", v: 2});
db.coll.insert({category: "cat2", v: 3});
// command
db.coll.createIndex({category: 1}, {collation: {locale: "fr"}});
// command
db.coll.getIndexes();
// clear
db.coll.drop();
