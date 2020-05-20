// before
db.coll.remove({});
// command
db.coll.bulkWrite([{insertOne: {document: {a: 1}}},{insertOne: {document: {a: 1}}}]);
// clear
db.coll.drop();
