// before
db.coll.remove({});
// command
db.coll.insertOne({a: 1}, {writeConcern: {w: -1}});
// command
db.coll.find();
