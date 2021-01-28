import CliServiceProvider from '../cli-service-provider';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { ConnectionString, ReplPlatform } from '@mongosh/service-provider-core';

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
  /**
   * Instantiate a new CompassServiceProvider with the data-service's connected
   * MongoClient instance.
   *
   * @param {MongoClient} mongoClient - The Node drivers' MongoClient instance.
   * @param {string} uri - optional URI for telemetry.
   */
  constructor(
    mongoClient: MongoClient,
    clientOptions: MongoClientOptions = {},
    uri?: ConnectionString
  ) {
    super(mongoClient, clientOptions, uri);
    this.platform = ReplPlatform.Compass;
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
