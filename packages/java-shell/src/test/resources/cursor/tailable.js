// before
db.coll.insert({"_id": 1, name: "Vasya"});
db.coll.insert({"_id": 2, name: "Petya"});
db.coll.insert({"_id": 3, name: "Lyusya"});
// command
db.coll.find().tailable();
// clear
db.coll.drop();