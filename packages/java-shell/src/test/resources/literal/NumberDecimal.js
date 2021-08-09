// before
db.coll.insertOne({"_id": 1, v: new NumberDecimal("24")});
// command checkResultClass
new NumberDecimal("24")
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();