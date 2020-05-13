import { Collection, Mongo } from './index';

export default class Explainable {
  mongo: Mongo;
  collection: Collection;
  verbosity: string;
  constructor(mongo, collection, verbosity) {
    this.mongo = mongo;
    this.collection = collection;
    this.verbosity = verbosity;
  }
}
