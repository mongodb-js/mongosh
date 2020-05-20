// before
db.testCollection1.remove({});
db.testCollection1.insertOne({a: 1});
// command
db.getCollectionInfos({name: {$regex: "testCollection.*"}});
// clear
db.testCollection1.drop();
