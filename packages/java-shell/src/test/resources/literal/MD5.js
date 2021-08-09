// before
db.coll.insertOne({"_id": 1, v: new MD5('31323334')});
// command checkResultClass
new MD5('31323334')
// command checkResultClass
MD5('31323334')
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();