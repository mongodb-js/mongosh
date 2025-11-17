import type { ApiEvent, MongoshBus } from '@mongosh/types';
import type { MongoLogWriter } from 'mongodb-log-writer';
import type { MongoshAnalytics } from './analytics-helpers';
import type { MultiSet } from './helpers';

export interface MongoshLoggingAndTelemetry {
  attachLogger(logger: MongoLogWriter): void;
  detachLogger(): Promise<void>;
  /** Flush any remaining log or telemetry events. */
  flush(): Promise<void>;
}

export type MongoshLoggingAndTelemetryArguments = {
  bus: MongoshBus;
  analytics: MongoshAnalytics;
  userTraits: { platform: string } & {
    [key: string]: unknown;
  };
  mongoshVersion: string;
  /** Machine-specific ID; gets set automatically when omitted */
  deviceId?: string | undefined;
};

export type MongoshTrackingProperties = {
  mongosh_version: string;
  session_id: string;
};

export type LoggingAndTelemetryBusEventState = {
  hasStartedMongoshRepl: boolean;
  apiCallTracking: {
    isEnabled: boolean;
    apiCalls: MultiSet<Pick<ApiEvent, 'class' | 'method'>>;
    deprecatedApiCalls: MultiSet<Pick<ApiEvent, 'class' | 'method'>>;
  };
  usesShellOption: boolean;
  telemetryAnonymousId: string | undefined;
  userId: string | undefined;
};
