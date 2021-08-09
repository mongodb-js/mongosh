// before
db.coll.insertOne({"_id": 1, v: new HexData(16, '31323334')});
// command checkResultClass
new HexData(16, '31323334')
// command checkResultClass
HexData(16, '31323334')
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();
