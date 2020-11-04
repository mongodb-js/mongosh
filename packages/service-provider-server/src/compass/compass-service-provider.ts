import CliServiceProvider from '../cli-service-provider';
import { MongoClient } from 'mongodb';
import { DEFAULT_DB, ReplPlatform } from '@mongosh/service-provider-core';

interface DataService {
  client: {
    client: MongoClient;
  };
}

/**
 * A service provider that is meant to be used in compass.
 */
class CompassServiceProvider extends CliServiceProvider {
  public readonly platform: ReplPlatform;
  public readonly initialDb: string;
  /**
   * Instantiate a new CompassServiceProvider with the data-service's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   * @param {string} uri - optional URI for telemetry.
   */
  constructor(mongoClient: MongoClient, uri?: string) {
    super(mongoClient, uri);
    this.platform = ReplPlatform.Compass;
    try {
      this.initialDb = (mongoClient as any).s.options.dbName || DEFAULT_DB;
    } catch (err) {
      this.initialDb = DEFAULT_DB;
    }
  }
  /**
   * Creates a new CompassServiceProvider that uses compass
   * data service (https://www.npmjs.com/package/mongodb-data-service) for
   * transport.
   *
   * @param {DataService} dataService - a DataService instance
   * @returns {CompassServiceProvider} - a new CompassServiceProvider
   */
  static fromDataService(dataService: DataService): CompassServiceProvider {
    const mongoClient = dataService.client.client;

    return new CompassServiceProvider(mongoClient);
  }
}

export default CompassServiceProvider;
