import CliServiceProvider from './cli-service-provider';
import { MongoClient } from 'mongodb';
import { NodeTransport } from 'mongosh-transport-server';

interface DataService {
  client: {
    client: MongoClient
  }
}

/**
 * A service provider that is meant to be used in compass.
 */
class CompassServiceProvider extends CliServiceProvider {

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
    const nodeTransport = new NodeTransport(mongoClient);

    return new CompassServiceProvider(nodeTransport);
  }
};

export default CompassServiceProvider;
