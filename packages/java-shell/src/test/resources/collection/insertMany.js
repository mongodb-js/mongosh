// before
db.coll.remove({});
db.coll.insertMany([{a: 1}, {a: 2, array: [42, 43]}]);
// command
db.coll.find();
