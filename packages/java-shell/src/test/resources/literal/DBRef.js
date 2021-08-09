// before
db.coll.insertOne({"_id": 1, v: new DBRef('namespace', 'oid')});
// command checkResultClass
new DBRef('namespace', 'oid')
// command checkResultClass
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();