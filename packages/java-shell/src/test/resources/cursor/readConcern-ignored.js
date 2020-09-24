// before
db.coll.drop();
db.coll.insertOne({a: 1});
// command
db.coll.find().readConcern('local');
// clear
db.coll.drop();