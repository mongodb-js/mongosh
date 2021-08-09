// before
db.coll.insertOne({"_id": 1, v: new BinData(16, 'MTIzNA==')})
// command checkResultClass
new BinData(16, 'MTIzNA==')
// command checkResultClass
BinData(16, 'MTIzNA==')
// command checkResultClass
new BinData(4, 'MTIzNA==')
// command checkResultClass
db.coll.find().toArray()[0].v
// clear
db.coll.drop()