db.coll.drop()
db.coll.insertMany([...Array(3_000).keys()].map(i => ({i})));
print('ready')
counter = 0;

const offset = __getTimingData().length;
for (let i = 0; i < 150; i++) __loadExternalCode(`for (const doc of db.coll.find()) counter++`);
print('counter = ' + counter)
