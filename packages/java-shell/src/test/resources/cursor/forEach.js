// before
db.coll.remove({});
db.coll.insert({"_id": 1, name: "Vasya"});
db.coll.insert({"_id": 2, name: "Petya"});
db.coll.insert({"_id": 3, name: "Lyusya"});
const result = [];
// command
db.coll.find().forEach(d => result.push(d));
// command
result
// clear
db.coll.drop();