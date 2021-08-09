// before
db.coll.insertOne({"_id": 1, v: new Timestamp(100, 0)});
// command checkResultClass
new Timestamp(100, 0)
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();
