// before
db.coll.remove({});
// command
db.coll.insertMany([{a: 1}, {a: 2, array: [42, 43]}]);
// command
db.coll.find();
// clear
db.coll.drop();
