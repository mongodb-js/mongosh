// before
db.coll.remove({});
db.coll.insert({category: "cat1", v: 1});
db.coll.insert({category: "cat2", v: 2});
db.coll.insert({category: "cat3", v: 3});
// command
db.coll.createIndex({category: 1}, {unique: true});
// command
db.coll.insert({category: "cat1", v: 1});
// clear
db.coll.drop()
