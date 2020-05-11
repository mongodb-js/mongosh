// before
db.coll.remove({});
db.coll.insertMany([{a: 1}, {a: 2}]);
// command
db.coll.find();
