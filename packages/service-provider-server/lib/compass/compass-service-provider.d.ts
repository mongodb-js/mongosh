/// <reference types="node" />
import type { DevtoolsConnectOptions } from '../cli-service-provider';
import CliServiceProvider from '../cli-service-provider';
import type { MongoClient } from 'mongodb';
import type { ReplPlatform } from '@mongosh/service-provider-core';
import type ConnectionString from 'mongodb-connection-string-url';
import type { EventEmitter } from 'events';
declare class CompassServiceProvider extends CliServiceProvider {
    readonly platform: ReplPlatform;
    constructor(mongoClient: MongoClient, bus: EventEmitter, driverOptions: DevtoolsConnectOptions, uri?: ConnectionString);
}
export default CompassServiceProvider;
