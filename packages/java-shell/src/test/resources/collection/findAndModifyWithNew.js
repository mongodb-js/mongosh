// before
db.coll.deleteMany({});
db.coll.insertMany([{v: "a", number: 1}, {v: "b", number: 1}]);
// command
db.coll.findAndModify({query: {"v": "a"}, update: {$inc: {number: 1}}, new: true});
// command
db.coll.find();
// clear
db.coll.drop();
