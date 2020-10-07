// before
db.coll.remove({});
db.coll.insert({});
// command
db.coll.find().noCursorTimeout()
// clear
db.coll.drop();