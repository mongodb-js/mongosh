// before
db.coll.remove({});
// before
db.coll.insertOne({a: 1});
// command
db.coll.find().readConcern('local');
