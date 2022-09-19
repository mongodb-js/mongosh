// before
db.coll.drop();
// command
db.createCollection('coll', {
    timeseries: {
        timeField: "timestamp",
        metaField: "metadata",
        granularity: "minutes"
    },
    expireAfterSeconds: 60 * 60 * 24 * 365 * 10
})
// command
db.coll.insertOne(
    {
        "metadata": { "sensorId": 5578, "type": "temperature" },
        "timestamp": new ISODate("2022-09-09T00:00:00.000Z"),
        "temp": 12
    });
// command
db.coll.findOne({
    "timestamp": new ISODate("2022-09-09T00:00:00.000Z")
}, {_id: 0, timestamp: 1});
// clear
db.coll.drop();