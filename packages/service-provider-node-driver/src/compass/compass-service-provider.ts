import type { DevtoolsConnectOptions } from '../node-driver-service-provider';
import { NodeDriverServiceProvider } from '../node-driver-service-provider';
import type { MongoClient, TopologyDescription } from 'mongodb';
import type { ReplPlatform } from '@mongosh/service-provider-core';
import type ConnectionString from 'mongodb-connection-string-url';
import type { EventEmitter } from 'events';

/**
 * A service provider that is meant to be used in compass.
 */
export class CompassServiceProvider extends NodeDriverServiceProvider {
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
    uri?: ConnectionString,
    lastSeenTopology?: TopologyDescription
  ) {
    super(mongoClient, bus, driverOptions, uri, lastSeenTopology);
    this.platform = 'Compass';
  }
}
