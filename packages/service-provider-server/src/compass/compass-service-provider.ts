import type { DevtoolsConnectOptions } from '../cli-service-provider';
import CliServiceProvider from '../cli-service-provider';
import type { MongoClient } from 'mongodb';
import type { ReplPlatform } from '@mongosh/service-provider-core';
import type ConnectionString from 'mongodb-connection-string-url';
import type { EventEmitter } from 'events';

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
   * @param {MongoClientOptions} driverOptions
   * @param {string} uri - optional URI for telemetry.
   */
  constructor(
    mongoClient: MongoClient,
    bus: EventEmitter,
    driverOptions: DevtoolsConnectOptions,
    uri?: ConnectionString
  ) {
    super(mongoClient, bus, driverOptions, uri);
    this.platform = 'Compass';
  }
}

export default CompassServiceProvider;
