import Mongo from './mongo';
import {
  shellApiClassDefault,
  // returnsPromise,
  // returnType,
  hasAsyncChild,
  ShellApiClass
} from './main';

@shellApiClassDefault
@hasAsyncChild
export default class Collection extends ShellApiClass {
  mongo: Mongo;
  database: any; // to avoid circular ref
  name: string;
  constructor(mongo, database, name) {
    super();
    this.mongo = mongo;
    this.database = database;
    this.name = name;
  }
}
