// before
db.coll.drop();
// command
db.createCollection('coll', {
    timeseries: {
        timeField: "timestamp",
        metaField: "metadata",
        granularity: "minutes"
    },
    expireAfterSeconds: 86400
})
// command
db.coll.insertOne(
    {
        "metadata": { "sensorId": 5578, "type": "temperature" },
        "timestamp": ISODate("2021-05-18T00:00:00.000Z"),
        "temp": 12
    });
// command
db.coll.findOne({
    "timestamp": ISODate("2021-05-18T00:00:00.000Z")
})
// clear
db.coll.drop();