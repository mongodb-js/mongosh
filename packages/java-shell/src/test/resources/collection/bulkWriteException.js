// before
db.coll.remove({});
// command
db.coll.bulkWrite([{unknown: {document: {a: 1}}}]);
// clear
db.coll.drop();
