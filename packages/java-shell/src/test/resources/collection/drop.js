// before
db.coll.remove({});
db.coll.insertOne({a: 1});
// command
db.coll.drop();
// command
db.coll.find();
