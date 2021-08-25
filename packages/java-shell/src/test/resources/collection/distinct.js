// before
db.coll.deleteMany({});
db.coll.insertOne({num: 1, str: "hello", mixedType: 1,       doc: {},     category: "café"});
db.coll.insertOne({num: 2, str: "world", mixedType: "hello", doc: {},     category: "cafe"});
db.coll.insertOne({num: 3, str: "hello", mixedType: 2,       doc: {a: 1}, category: "cafE", onlyInOneDoc: 1});
// command sort
db.coll.distinct("num");
// command sort
db.coll.distinct("str");
// command sort
db.coll.distinct("mixedType");
// command sort
db.coll.distinct("onlyInOneDoc");
// command sort
db.coll.distinct("doc");
// command sort
db.coll.distinct("str", {num: 1});
// command sort
db.coll.distinct("category", {}, {collation: {locale: "fr", strength: 1}});
// clear
db.coll.drop();
