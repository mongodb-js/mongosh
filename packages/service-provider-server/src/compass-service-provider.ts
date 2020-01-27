import CliServiceProvider from './cli-service-provider';
import { MongoClient } from 'mongodb';
import { NodeTransport } from 'mongosh-transport-server';

interface CompassDataService {
  client: MongoClient
}

class CompassServiceProvider extends CliServiceProvider {
  constructor(dataService: CompassDataService) {
    const mongoClient = dataService.client.client;
    const nodeTransport = new NodeTransport(mongoClient);
    super(nodeTransport);
  }
};

export default CompassServiceProvider;
