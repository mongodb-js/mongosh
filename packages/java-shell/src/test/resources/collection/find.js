// before
db.coll.remove({});
db.coll.insertOne({key: "value", array: [1, 2, 3, {another_object: "  .$# "}]});
// command
db.coll.find();
