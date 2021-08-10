// before
db.coll.insertOne({"_id": 1, v: new NumberInt("24")});
// command checkResultClass
NumberInt("24")
// command checkResultClass
new NumberInt("24")
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();