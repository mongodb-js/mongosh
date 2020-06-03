// before
db.coll.remove({});
db.coll.insert({"_id": 1, name: "Vasya"});
db.coll.insert({"_id": 2, name: "Petya"});
db.coll.insert({"_id": 3, name: "Lyusya"});
// command extractProperty=ok
db.coll.explain().aggregate([{$sort: {_id: -1}}], {collation: {"locale": "en_US", strength: 1}});
// clear
db.coll.drop();