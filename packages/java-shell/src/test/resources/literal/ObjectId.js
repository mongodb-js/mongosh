// before
db.coll.insertOne({"_id": 1, v: new ObjectId('5ebaf064121756574a9767cf')});
// command checkResultClass dontReplaceId
new ObjectId('5ebaf064121756574a9767cf')
// command checkResultClass dontReplaceId
ObjectId('5ebaf064121756574a9767cf')
// command checkResultClass
new ObjectId()
// command checkResultClass dontReplaceId
db.coll.find().toArray()[0].v;
// clear
db.coll.drop();