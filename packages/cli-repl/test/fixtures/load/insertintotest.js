/* eslint-disable no-undef */
insertTestCollection = db.getSiblingDB('test').getCollection('insertTest' + ((Math.random() * 100000) | 0));
print('Inserted:', insertTestCollection.insertOne({}).insertedId)
