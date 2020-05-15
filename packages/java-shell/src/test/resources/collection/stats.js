// before
db.coll.remove({});
db.coll.insertOne({a: 1});
// command extractProperty=ns
db.coll.stats()
// clear
db.coll.drop();
