// before
db.coll.remove({});
db.coll.insertOne({a: 1});
// command
db.coll.replaceOne({a: 2}, {a: 3}, {upsert: true});
// command
db.coll.find();
