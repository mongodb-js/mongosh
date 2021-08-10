// before
db.coll.insertOne({"_id": 1, v: new BSONSymbol('c')});
// command checkResultClass
BSONSymbol('a')
// command checkResultClass
new BSONSymbol('b')
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();
