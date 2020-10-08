// before
db.coll.remove({});
db.coll.insert({"_id": 1, name: "Vasya"});
db.coll.insert({"_id": 2, name: "Petya"});
db.coll.insert({"_id": 3, name: "Lyusya"});
// command extractProperty=queryPlanner extractProperty=namespace
db.coll.explain().find();
// command extractProperty=queryPlanner extractProperty=namespace
db.coll.explain("executionStats").find();
// clear
db.coll.drop();