// before
db.coll.insertOne({"_id": 1, v: new MinKey()});
// command checkResultClass
new MinKey();
// command checkResultClass
MinKey()
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();