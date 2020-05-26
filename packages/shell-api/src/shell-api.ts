import {
  shellApiClassDefault,
  hasAsyncChild,
  ShellApiClass,
  returnsPromise,
  serverVersions,
} from './decorators';
import { CursorIterationResult } from './result';
import ShellInternalState from './shell-internal-state';
import bson from 'bson';
import { ServerVersions } from './enums';

type DateConstructorArguments = [ any?, any?, ...any[] ];
export function dateHelper(...args: DateConstructorArguments): Date {
  if (args.length === 0) {
    return new Date();
  }
  if (args.length === 1) {
    return new Date(args[0]);
  }
  return new Date(Date.UTC(...args));
}

@shellApiClassDefault
@hasAsyncChild
export default class ShellApi extends ShellApiClass {
  private internalState: ShellInternalState;
  public Date: Function;

  constructor(internalState) {
    super();
    this.internalState = internalState;
    this.Date = function(...args: DateConstructorArguments): Date|string {
      const date = dateHelper(...args);
      if (new.target) {
        return date;
      }
      return date.toString();
    };
  }

  use(db): any {
    return this.internalState.currentDb.mongo.use(db);
  }
  show(arg): any {
    return this.internalState.currentDb.mongo.show(arg);
  }

  @returnsPromise
  async it(): Promise<any> {
    if (!this.internalState.currentCursor) {
      // TODO: warn here
      return new CursorIterationResult();
    }
    return await this.internalState.currentCursor._it();
  }
  RegExp(...args: [ string, string? ]): RegExp {
    return new RegExp(...args);
  }
  Map(...args): bson.Map {
    return new bson.Map(...args);
  }
  DBRef(...args): bson.DBRef {
    return new bson.DBRef(...args);
  }
  @serverVersions([ServerVersions.earliest, '1.6.0'])
  DBPointer(...args): bson.DBPointer {
    return new bson.DBPointer(...args);
  }
  MaxKey(...args): bson.MaxKey {
    return new bson.MaxKey(...args);
  }
  MinKey(...args): bson.Minkey {
    return new bson.MinKey(...args);
  }
  ObjectId(...args): bson.ObjectID {
    return new bson.ObjectID(...args);
  }
  @serverVersions([ServerVersions.earliest, '2.2.0'])
  Symbol(...args): bson.Symbol {
    return new bson.BSONSymbol(...args);
  }
  Timestamp(...args): bson.Timestamp {
    return new bson.Timestamp(...args);
  }
  Code(c, s): bson.Code {
    return new bson.Code(c, s);
  }
  @serverVersions(['3.4.0', ServerVersions.latest])
  NumberDecimal(s): bson.Decimal128 {
    if (s === undefined) {
      s = '0';
    }
    return bson.Decimal128.fromString(s.toString());
  }
  NumberInt(s): any {
    return parseInt(s, 10);
  }
  NumberLong(v): bson.Long {
    if (v === undefined) {
      v = 0;
    }
    return bson.Long.fromNumber(v);
  }
  ISODate(...args: DateConstructorArguments): Date {
    return dateHelper(...args);
  }
  BinData(subtype, b64string): bson.Binary { // this from 'help misc' in old shell
    const buffer = Buffer.from(b64string, 'base64');
    return new bson.Binary(buffer, subtype);
  }
  HexData(subtype, hexstr): bson.Binary {
    const buffer = Buffer.from(hexstr, 'hex');
    return new bson.Binary(buffer, subtype);
  }
  UUID(hexstr): bson.Binary {
    const buffer = Buffer.from(hexstr, 'hex');
    return new bson.Binary(buffer, bson.Binary.SUBTYPE_UUID);
  }
  MD5(hexstr): bson.Binary {
    const buffer = Buffer.from(hexstr, 'hex');
    return new bson.Binary(buffer, bson.Binary.SUBTYPE_MD5);
  }
  bsonsize(object): any {
    return bson.calculateObjectSize(object);
  }
}
