// before
db.coll.deleteMany({});
db.coll.insertOne({a: 1});
// command
wasCapped = db.coll.isCapped()
// command
db.coll.convertToCapped(10240)
// command
isCapped = db.coll.isCapped()
// clear
db.coll.drop();
