// before
db.coll.insertOne({"_id": 1, v: [1, 2, "hello \n world"]});
// command checkResultClass
[1, 2, "hello \n world"]
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();
