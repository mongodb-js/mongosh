// before
db.testCollection1.remove({});
db.testCollection2.remove({});
db.testCollection1.insertOne({a: 1});
db.testCollection2.insertOne({a: 1});
// command
db.getCollectionInfos({name: {$regex: "testCollection.*"}});
// clear
db.testCollection1.drop();
db.testCollection2.drop();
