// before
db.coll.insertOne({"_id": 1, v: new MaxKey()});
// command checkResultClass
new MaxKey();
// command checkResultClass
MaxKey()
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();