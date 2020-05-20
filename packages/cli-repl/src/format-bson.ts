const BSONTypes = ['Binary', 'Code', 'DBRef', 'Decimal128', 'Double',
  'Int32', 'Long', 'MaxKey', 'MinKey', 'ObjectID', 'BSONRegExp', 'Symbol', 'Timestamp'];
// Get the mongodb module
const mongodb = require('mongodb');
const toJSONMethods = {};

// Save toJSON render functions
for (const _type of BSONTypes) {
  if (mongodb[_type]) {
    toJSONMethods[_type] = mongodb[_type].prototype.toJSON;
  }
}

function fixBSONTypeOutput(string, regexp) {
  const match = string.match(regexp);
  if (!match) return string;
  string = string.replace(
    match[0],
    match[0].substr(1, match[0].length - 2).replace(/\\\"/g, '\"')
  );

  return fixBSONTypeOutput(string, regexp);
}

export default function bsonWriter(line) {
  mongodb.ObjectId.prototype.toJSON = function() {
    return `ObjectId("${this.toHexString()}")`;
  };

  if (Array.isArray(line)) return JSON.stringify(line, null, 2);
  // Serialize the object to JSON
  if (line && typeof line === 'object') {
    line = JSON.stringify(line, null, 2);
  } else if (typeof line === 'number') {
    line = '' + line;
  }

  // Do some post processing for specal BSON values
  if (typeof line === 'string') {
    line = fixBSONTypeOutput(line, /\"ObjectId\(\\\"[0-9|a-f|A-F]*\\\"\)\"/);
  }

  return JSON.parse(line);
}
