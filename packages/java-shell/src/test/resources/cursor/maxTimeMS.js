// before
db.coll.remove({});
db.coll.insert({});
// command
db.coll.find().maxTimeMS(100);
// clear
db.coll.drop();