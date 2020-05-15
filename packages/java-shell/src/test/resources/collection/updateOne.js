// before
db.coll.remove({});
db.coll.insertOne({a: 1});
db.coll.insertOne({a: 1});
db.coll.insertOne({a: 1});
// command
db.coll.updateOne({a: 1}, {$set: {b: 1}});
// command
db.coll.find();
