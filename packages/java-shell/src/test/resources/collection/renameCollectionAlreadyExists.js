// before
db.coll.drop();
db.newName.drop();
db.coll.insertOne({a: 1});
db.newName.insertOne({a: 2});
// command
db.coll.renameCollection('newName');
// command
db.coll.find();
// command
db.newName.find();
// clear
db.coll.drop();
db.newName.drop();
