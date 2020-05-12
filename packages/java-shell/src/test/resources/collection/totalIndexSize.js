// before
db.coll.remove({});
db.coll.insert({key: "value"});
// command
db.coll.totalIndexSize();
// clear
db.coll.drop();