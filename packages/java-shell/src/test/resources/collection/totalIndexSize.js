// before
db.coll.remove({});
db.coll.insert({key: "value"});
// command dontCheckValue
db.coll.totalIndexSize();
// clear
db.coll.drop();