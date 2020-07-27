import {
  ALL_PLATFORMS,
  ALL_SERVER_VERSIONS,
  ALL_TOPOLOGIES,
  ServerVersions
} from './enums';
import Help from './help';

function constructHelp(className): Help {
  const classHelpKeyPrefix = `shell-api.classes.${className}.help`;
  const classHelp = {
    help: `${classHelpKeyPrefix}.description`,
    docs: `${classHelpKeyPrefix}.link`,
    attr: []
  };
  return new Help(classHelp);
}

/**
 * This method modifies the BSON class passed in as argument. This is required so that
 * we can have the driver return our BSON classes without having to write our own serializer.
 * @param {Object} bson
 */
export default function(bson): void {
  [
    'Binary', 'Code', 'DBRef', 'Decimal128', 'Int32', 'Long',
    'MaxKey', 'MinKey', 'ObjectId', 'Timestamp', 'Symbol', 'Map'
  ].forEach((className) => {
    bson[className].prototype.serverVersions = ALL_SERVER_VERSIONS;
    bson[className].prototype.platforms = ALL_PLATFORMS;
    bson[className].prototype.topologies = ALL_TOPOLOGIES;

    const help = constructHelp(className);
    bson[className].prototype.help = (): Help => (help);
    Object.setPrototypeOf(bson[className].prototype.help, help);
  });

  const toString = require('util').inspect.custom || 'inspect';

  bson.ObjectId.prototype[toString] = function(): string {
    return `ObjectId("${this.toHexString()}")`;
  };
  bson.ObjectId.prototype.asPrintable = bson.ObjectId.prototype[toString];

  bson.DBRef.prototype[toString] = function(): string {
    return `DBRef("${this.namespace}", ${this.oid[toString]()}${this.db ? `, "${this.db}"` : ''})`;
  };
  bson.DBRef.prototype.asPrintable = bson.DBRef.prototype[toString];

  bson.MaxKey.prototype[toString] = function(): string {
    return '{ "$maxKey" : 1 }';
  };
  bson.MaxKey.prototype.asPrintable = bson.MaxKey.prototype[toString];

  bson.MinKey.prototype[toString] = function(): string {
    return '{ "$minKey" : 1 }';
  };
  bson.MinKey.prototype.asPrintable = bson.MinKey.prototype[toString];

  bson.Timestamp.prototype[toString] = function(): string {
    return `Timestamp(${this.getLowBits().toString()}, ${this.getHighBits().toString()})`;
  };
  bson.Timestamp.prototype.asPrintable = bson.Timestamp.prototype[toString];

  // The old shell could not print Symbols so this was undefined behavior
  bson.Symbol.prototype[toString] = function(): string {
    return `"${this.valueOf()}"`;
  };
  bson.Symbol.prototype.serverVersions = [ ServerVersions.earliest, '1.6.0' ];
  bson.Symbol.prototype.asPrintable = bson.Symbol.prototype[toString];

  bson.Code.prototype[toString] = function(): string {
    const j = this.toJSON();
    return `{ "code" : "${j.code}"${j.scope ? `, "scope" : ${JSON.stringify(j.scope)}` : ''} }`;
  };
  bson.Code.prototype.asPrintable = bson.Code.prototype[toString];

  bson.Decimal128.prototype[toString] = function(): string {
    return `NumberDecimal("${this.toString()}")`;
  };
  const helpDecimal = constructHelp('NumberDecimal');
  bson.Decimal128.prototype.help = (): Help => (helpDecimal);
  Object.setPrototypeOf(bson.Decimal128.prototype.help, helpDecimal);
  bson.Decimal128.prototype.asPrintable = bson.Decimal128.prototype[toString];

  bson.Int32.prototype[toString] = function(): string {
    return `NumberInt(${this.valueOf()})`;
  };
  const helpInt = constructHelp('NumberInt');
  bson.Int32.prototype.help = (): Help => (helpInt);
  Object.setPrototypeOf(bson.Int32.prototype.help, helpInt);
  bson.Int32.prototype.asPrintable = bson.Int32.prototype[toString];

  bson.Long.prototype[toString] = function(): string {
    return `NumberLong(${this.toNumber()})`;
  };
  const helpLong = constructHelp('NumberLong');
  bson.Long.prototype.help = (): Help => (helpLong);
  Object.setPrototypeOf(bson.Long.prototype.help, helpLong);
  bson.Long.prototype.asPrintable = bson.Long.prototype[toString];

  bson.Binary.prototype[toString] = function(): string {
    return `BinData(${this.sub_type}, "${this.value()}")`;
  };
  const helpBinData = constructHelp('BinData');
  bson.Binary.prototype.help = (): Help => (helpBinData);
  Object.setPrototypeOf(bson.Binary.prototype.help, helpBinData);
  bson.Binary.prototype.asPrintable = bson.Binary.prototype[toString];
}
