// before
db.coll.insertOne({"_id": 1, v: new NumberLong("24")});
// command checkResultClass
NumberLong("24")
// command checkResultClass
new NumberLong("24")
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();