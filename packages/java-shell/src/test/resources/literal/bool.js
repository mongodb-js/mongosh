// before
db.coll.insertOne({"_id": 1, v: true});
// command checkResultClass
true
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();
