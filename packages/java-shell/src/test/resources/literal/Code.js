// before
db.coll.insertOne({"_id": 1, v: Code('code', { k: 'v' })});
// command checkResultClass
Code('code', { k: 'v' })
// command checkResultClass
Code('code')
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();
