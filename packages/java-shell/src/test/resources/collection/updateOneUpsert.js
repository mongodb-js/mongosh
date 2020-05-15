// before
db.coll.remove({});
// command
db.coll.updateOne({a: 1}, {$set: {b: 1}}, {upsert: true});
// command
db.coll.find();
