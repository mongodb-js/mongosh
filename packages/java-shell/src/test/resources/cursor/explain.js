// before
db.coll.deleteMany({});
db.coll.insertOne({"_id": 1, name: "Vasya"});
db.coll.insertOne({"_id": 2, name: "Petya"});
db.coll.insertOne({"_id": 3, name: "Lyusya"});
// command extractProperty=queryPlanner extractProperty=namespace
db.coll.explain().find();
// command extractProperty=queryPlanner extractProperty=namespace
db.coll.explain("executionStats").find();
// command extractProperty=queryPlanner extractProperty=namespace
db.coll.find().explain();
// command containsProperty=executionStats
db.coll.find().explain("executionStats");
// command containsProperty=executionStats
db.coll.find().explain("queryPlanner");
// clear
db.coll.drop();
