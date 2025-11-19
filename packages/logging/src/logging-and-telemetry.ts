import {
  redact,
  redactConnectionString,
  shouldRedactCommand,
} from 'mongodb-redact';
import type {
  MongoshBus,
  ApiEventWithArguments,
  ApiEvent,
  UseEvent,
  EvaluateInputEvent,
  ShowEvent,
  ConnectEvent,
  ScriptLoadFileEvent,
  StartLoadingCliScriptsEvent,
  StartMongoshReplEvent,
  GlobalConfigFileLoadEvent,
  CryptLibrarySkipEvent,
  CryptLibraryFoundEvent,
  SnippetsCommandEvent,
  SnippetsErrorEvent,
  SnippetsFetchIndexErrorEvent,
  SnippetsFetchIndexEvent,
  SnippetsLoadedEvent,
  SnippetsLoadSnippetEvent,
  SnippetsNpmDownloadActiveEvent,
  SnippetsNpmDownloadFailedEvent,
  SnippetsNpmLookupEvent,
  SnippetsRunNpmEvent,
  SnippetsTransformErrorEvent,
  EditorRunEditCommandEvent,
  EditorReadVscodeExtensionsDoneEvent,
  EditorReadVscodeExtensionsFailedEvent,
  FetchingUpdateMetadataEvent,
  FetchingUpdateMetadataCompleteEvent,
  SessionStartedEvent,
  MongoshBusEventsMap,
  WriteCustomLogEvent,
} from '@mongosh/types';
import { inspect } from 'util';
import { MongoLogWriter } from 'mongodb-log-writer';
import { mongoLogId } from 'mongodb-log-writer';
import type {
  AnalyticsIdentifyMessage,
  AnalyticsTrackMessage,
  MongoshAnalytics,
  MongoshAnalyticsIdentity,
} from './analytics-helpers';
import type { ConnectEventMap } from '@mongodb-js/devtools-connect';
import { hookLogger } from '@mongodb-js/devtools-connect';
import { MultiSet, toSnakeCase } from './helpers';
import { Writable } from 'stream';
import type {
  LoggingAndTelemetryBusEventState,
  MongoshLoggingAndTelemetry,
  MongoshLoggingAndTelemetryArguments,
  MongoshTrackingProperties,
} from './types';
import { getDeviceId } from '@mongodb-js/device-id';

export function setupLoggingAndTelemetry(
  props: MongoshLoggingAndTelemetryArguments
): MongoshLoggingAndTelemetry {
  const loggingAndTelemetry = new LoggingAndTelemetry(props);

  loggingAndTelemetry.setup();
  return loggingAndTelemetry;
}

/** @internal */
export class LoggingAndTelemetry implements MongoshLoggingAndTelemetry {
  private static dummyLogger = new MongoLogWriter(
    '',
    null,
    new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    })
  );

  private readonly bus: MongoshBus;
  private readonly analytics: MongoshAnalytics;
  private readonly userTraits: {
    platform: string;
    [key: string]: unknown;
  };
  private readonly mongoshVersion: string;

  private log: MongoLogWriter;
  private pendingBusEvents: CallableFunction[] = [];
  private pendingTelemetryEvents: CallableFunction[] = [];
  private isSetup = false;
  private isBufferingBusEvents = false;
  private isBufferingTelemetryEvents = false;

  private deviceId: string | undefined;

  /** @internal Used for awaiting the telemetry setup in tests. */
  public setupTelemetryPromise: Promise<void> = Promise.resolve();

  private readonly telemetrySetupAbort: AbortController = new AbortController();

  constructor({
    bus,
    analytics,
    userTraits,
    mongoshVersion,
    deviceId,
  }: MongoshLoggingAndTelemetryArguments) {
    this.bus = bus;
    this.analytics = analytics;
    this.log = LoggingAndTelemetry.dummyLogger;
    this.userTraits = userTraits;
    this.mongoshVersion = mongoshVersion;
    this.deviceId = deviceId;
  }

  public setup(): void {
    if (this.isSetup) {
      throw new Error('Setup can only be called once.');
    }
    this.isBufferingTelemetryEvents = true;
    this.isBufferingBusEvents = true;

    this.setupTelemetryPromise = this.setupTelemetry();
    this.setupBusEventListeners();

    this.isSetup = true;
  }

  public async flush(): Promise<void> {
    // Run any other pending events with the set or dummy log for telemetry purposes.
    this.runAndClearPendingBusEvents();

    // Abort setup, which will cause the device ID to be set to 'unknown'
    // and run any remaining telemetry events
    this.telemetrySetupAbort.abort();

    await this.log.flush();
  }

  private async setupTelemetry(): Promise<void> {
    if (!this.deviceId) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const getMachineId = require('native-machine-id').getMachineId;
        this.deviceId = await getDeviceId({
          getMachineId: () => getMachineId({ raw: true }),
          onError: (reason, error) => {
            if (reason === 'abort') {
              return;
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.bus.emit('mongosh:error', error, 'telemetry');
          },
          abortSignal: this.telemetrySetupAbort.signal,
        });
      } catch (error) {
        this.deviceId = 'unknown';
        this.bus.emit('mongosh:error', error as Error, 'telemetry');
      }
    }

    this.runAndClearPendingTelemetryEvents();
  }

  public attachLogger(logger: MongoLogWriter): void {
    if (!this.isSetup) {
      throw new Error('Run setup() before setting up the log writer.');
    }
    /** Setup can only be run when overriding a dummy log or a null log. */
    if (this.log !== LoggingAndTelemetry.dummyLogger) {
      throw new Error(
        'Previously set logger has not been detached. Run detachLogger() before setting.'
      );
    }
    this.log = logger;

    this.runAndClearPendingBusEvents();

    this.bus.emit('mongosh:log-initialized');
  }

  public async detachLogger(): Promise<void> {
    this.log = LoggingAndTelemetry.dummyLogger;

    await this.flush();
  }

  private runAndClearPendingBusEvents() {
    let pendingEvent: CallableFunction | undefined;
    while ((pendingEvent = this.pendingBusEvents.shift())) {
      pendingEvent();
    }
    this.isBufferingBusEvents = false;
  }

  private runAndClearPendingTelemetryEvents() {
    let pendingEvent: CallableFunction | undefined;
    while ((pendingEvent = this.pendingTelemetryEvents.shift())) {
      pendingEvent();
    }
    this.isBufferingTelemetryEvents = false;
  }

  /** Information used and set by different bus events. */
  private busEventState: LoggingAndTelemetryBusEventState = {
    /** We emit different analytics events for loading files and evaluating scripts
     * depending on whether we're already in the REPL or not yet. We store the
     * state here so that the places where the events are emitted don't have to
     * be aware of this distinction. */
    hasStartedMongoshRepl: false,
    apiCallTracking: {
      isEnabled: false,
      apiCalls: new MultiSet<Pick<ApiEvent, 'class' | 'method'>>(),
      deprecatedApiCalls: new MultiSet<Pick<ApiEvent, 'class' | 'method'>>(),
    },
    usesShellOption: false,
    telemetryAnonymousId: undefined,
    userId: undefined,
  };

  private setupBusEventListeners(): void {
    const onBus = <
      EventsMap extends Record<
        keyof MongoshBusEventsMap | keyof ConnectEventMap,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (...args: any[]) => unknown
      > = MongoshBusEventsMap,
      K extends
        | keyof MongoshBusEventsMap
        | keyof ConnectEventMap = keyof MongoshBusEventsMap
    >(
      event: K,
      listener: (...args: Parameters<EventsMap[K]>) => void
    ) => {
      this.bus.on(event, ((...args: Parameters<EventsMap[K]>) => {
        if (this.isBufferingBusEvents) {
          this.pendingBusEvents.push(() => listener(...args));
          return;
        }
        listener(...args);
      }) as MongoshBusEventsMap[K]);
      return this.bus;
    };

    const getUserTraits = (): AnalyticsIdentifyMessage['traits'] => ({
      ...this.userTraits,
      device_id: this.deviceId ?? 'unknown',
      session_id: this.log.logId,
    });

    const getTrackingProperties = (): MongoshTrackingProperties => ({
      mongosh_version: this.mongoshVersion,
      session_id: this.log.logId,
    });

    const getTelemetryUserIdentity = (): MongoshAnalyticsIdentity => {
      return {
        anonymousId:
          this.busEventState.telemetryAnonymousId ??
          (this.busEventState.userId as string),
      };
    };

    const track = (
      message: Pick<AnalyticsTrackMessage, 'event' | 'timestamp'> & {
        properties?: Omit<
          AnalyticsTrackMessage['properties'],
          keyof MongoshTrackingProperties
        >;
      }
    ): void => {
      const callback = () =>
        this.analytics.track({
          ...getTelemetryUserIdentity(),
          ...message,
          properties: {
            ...getTrackingProperties(),
            ...message.properties,
          },
        });

      if (this.isBufferingTelemetryEvents) {
        this.pendingTelemetryEvents.push(callback);
      } else {
        callback();
      }
    };

    const identify = (): void => {
      const callback = () =>
        this.analytics.identify({
          ...getTelemetryUserIdentity(),
          traits: getUserTraits(),
        });

      if (this.isBufferingTelemetryEvents) {
        this.pendingTelemetryEvents.push(callback);
      } else {
        callback();
      }
    };

    onBus('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_002),
        'repl',
        'Started REPL',
        ev
      );
      this.busEventState.hasStartedMongoshRepl = true;
    });

    onBus(
      'mongosh:start-loading-cli-scripts',
      (event: StartLoadingCliScriptsEvent) => {
        this.log.info(
          'MONGOSH',
          mongoLogId(1_000_000_003),
          'repl',
          'Start loading CLI scripts'
        );
        this.busEventState.usesShellOption = event.usesShellOption;
      }
    );

    onBus('mongosh:connect', (args: ConnectEvent) => {
      const { uri, resolved_hostname, ...argsWithoutUriAndHostname } = args;
      const connectionUri = uri && redactConnectionString(uri);
      const atlasHostname = {
        atlas_hostname: args.is_atlas ? resolved_hostname : null,
      };
      const properties = {
        ...argsWithoutUriAndHostname,
        ...atlasHostname,
      };

      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_004),
        'connect',
        'Connecting to server',
        {
          userId: this.busEventState.userId,
          telemetryAnonymousId: this.busEventState.telemetryAnonymousId,
          connectionUri,
          ...properties,
        }
      );

      track({
        event: 'New Connection',
        properties,
      });
    });

    onBus('mongosh:start-session', (args: SessionStartedEvent) => {
      const normalizedTimingsArray = Object.entries(args.timings).map(
        ([key, duration]) => {
          const snakeCaseKey = toSnakeCase(key);
          return [snakeCaseKey, duration];
        }
      );

      const normalizedTimings = Object.fromEntries(normalizedTimingsArray);
      track({
        event: 'Startup Time',
        properties: {
          is_interactive: args.isInteractive,
          js_context: args.jsContext,
          ...normalizedTimings,
        },
      });
    });

    onBus(
      'mongosh:new-user',
      (newTelemetryUserIdentity: { userId: string; anonymousId: string }) => {
        if (!newTelemetryUserIdentity.anonymousId) {
          this.busEventState.userId = newTelemetryUserIdentity.userId;
        }
        this.busEventState.telemetryAnonymousId =
          newTelemetryUserIdentity.anonymousId;

        identify();
      }
    );

    onBus(
      'mongosh:update-user',
      (updatedTelemetryUserIdentity: {
        userId: string;
        anonymousId?: string;
      }) => {
        if (updatedTelemetryUserIdentity.anonymousId) {
          this.busEventState.telemetryAnonymousId =
            updatedTelemetryUserIdentity.anonymousId;
        } else {
          this.busEventState.userId = updatedTelemetryUserIdentity.userId;
        }
        identify();
        this.log.info(
          'MONGOSH',
          mongoLogId(1_000_000_005),
          'config',
          'User updated'
        );
      }
    );

    onBus('mongosh:error', (error: Error, context: string) => {
      const mongoshError = error as {
        name: string;
        message: string;
        code: unknown;
        scope: unknown;
        metadata: unknown;
      };

      this.log[context === 'fatal' ? 'fatal' : 'error'](
        'MONGOSH',
        mongoLogId(1_000_000_006),
        context,
        `${mongoshError.name}: ${mongoshError.message}`,
        error
      );

      if (error.name.includes('Mongosh')) {
        track({
          event: 'Error',
          properties: {
            name: mongoshError.name,
            code: mongoshError.code,
            scope: mongoshError.scope,
            metadata: mongoshError.metadata,
          },
        });
      }
    });

    onBus('mongosh:write-custom-log', (event: WriteCustomLogEvent) => {
      this.log[event.method](
        'MONGOSH-SCRIPTS',
        mongoLogId(1_000_000_054),
        'custom-log',
        event.message,
        event.attr,
        event.level
      );
    });

    onBus('mongosh:globalconfig-load', (args: GlobalConfigFileLoadEvent) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_048),
        'config',
        'Loading global configuration file',
        args
      );
    });

    onBus('mongosh:evaluate-input', (args: EvaluateInputEvent) => {
      if (shouldRedactCommand(args.input)) {
        this.log.info(
          'MONGOSH',
          mongoLogId(1_000_000_007),
          'repl',
          'Evaluating input',
          { input: '<sensitive command used>' }
        );
        return;
      }

      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_007),
        'repl',
        'Evaluating input',
        args
      );
    });

    onBus('mongosh:use', (args: UseEvent) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_008),
        'shell-api',
        'Used "use" command',
        args
      );

      track({
        event: 'Use',
      });
    });

    onBus('mongosh:show', (args: ShowEvent) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_009),
        'shell-api',
        'Used "show" command',
        args
      );

      track({
        event: 'Show',
        properties: {
          method: args.method,
        },
      });
    });

    onBus('mongosh:setCtx', (args: ApiEventWithArguments) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_010),
        'shell-api',
        'Initialized context',
        args
      );
    });

    onBus('mongosh:api-call-with-arguments', (args: ApiEventWithArguments) => {
      // TODO: redactInfo cannot handle circular or otherwise nontrivial input
      let arg;
      try {
        arg = JSON.parse(JSON.stringify(args));
      } catch {
        arg = { _inspected: inspect(args) };
      }
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_011),
        'shell-api',
        'Performed API call',
        redact(arg)
      );
    });

    onBus('mongosh:api-load-file', (args: ScriptLoadFileEvent) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_012),
        'shell-api',
        'Loading file via load()',
        args
      );

      track({
        event: this.busEventState.hasStartedMongoshRepl
          ? 'Script Loaded'
          : 'Script Loaded CLI',
        properties: {
          nested: args.nested,
          ...(this.busEventState.hasStartedMongoshRepl
            ? {}
            : { shell: this.busEventState.usesShellOption }),
        },
      });
    });

    onBus('mongosh:eval-cli-script', () => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_013),
        'repl',
        'Evaluating script passed on the command line'
      );

      track({
        event: 'Script Evaluated',
        properties: {
          shell: this.busEventState.usesShellOption,
        },
      });
    });

    onBus('mongosh:mongoshrc-load', () => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_014),
        'repl',
        'Loading .mongoshrc.js'
      );

      track({
        event: 'Mongoshrc Loaded',
      });
    });

    onBus('mongosh:mongoshrc-mongorc-warn', () => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_015),
        'repl',
        'Warning about .mongorc.js/.mongoshrc.js mismatch'
      );

      track({
        event: 'Mongorc Warning',
      });
    });

    onBus('mongosh:crypt-library-load-skip', (ev: CryptLibrarySkipEvent) => {
      this.log.info(
        'AUTO-ENCRYPTION',
        mongoLogId(1_000_000_050),
        'crypt-library',
        'Skipping shared library candidate',
        ev
      );
    });

    onBus('mongosh:crypt-library-load-found', (ev: CryptLibraryFoundEvent) => {
      this.log.warn(
        'AUTO-ENCRYPTION',
        mongoLogId(1_000_000_051),
        'crypt-library',
        'Accepted shared library candidate',
        {
          cryptSharedLibPath: ev.cryptSharedLibPath,
          expectedVersion: ev.expectedVersion.versionStr,
        }
      );
    });

    onBus('mongosh-snippets:loaded', (ev: SnippetsLoadedEvent) => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_019),
        'snippets',
        'Loaded snippets',
        ev
      );
    });

    onBus('mongosh-snippets:npm-lookup', (ev: SnippetsNpmLookupEvent) => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_020),
        'snippets',
        'Performing npm lookup',
        ev
      );
    });

    onBus('mongosh-snippets:npm-lookup-stopped', () => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_021),
        'snippets',
        'npm lookup stopped'
      );
    });

    onBus(
      'mongosh-snippets:npm-download-failed',
      (ev: SnippetsNpmDownloadFailedEvent) => {
        this.log.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_022),
          'snippets',
          'npm download failed',
          ev
        );
      }
    );

    onBus(
      'mongosh-snippets:npm-download-active',
      (ev: SnippetsNpmDownloadActiveEvent) => {
        this.log.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_023),
          'snippets',
          'npm download active',
          ev
        );
      }
    );

    onBus('mongosh-snippets:fetch-index', (ev: SnippetsFetchIndexEvent) => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_024),
        'snippets',
        'Fetching snippet index',
        ev
      );
    });

    onBus('mongosh-snippets:fetch-cache-invalid', () => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_025),
        'snippets',
        'Snippet cache invalid'
      );
    });

    onBus(
      'mongosh-snippets:fetch-index-error',
      (ev: SnippetsFetchIndexErrorEvent) => {
        this.log.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_026),
          'snippets',
          'Fetching snippet index failed',
          ev
        );
      }
    );

    onBus('mongosh-snippets:fetch-index-done', () => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_027),
        'snippets',
        'Fetching snippet index done'
      );
    });
    onBus(
      'mongosh-snippets:package-json-edit-error',
      (ev: SnippetsErrorEvent) => {
        this.log.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_028),
          'snippets',
          'Modifying snippets package.json failed',
          ev
        );
      }
    );

    onBus('mongosh-snippets:spawn-child', (ev: SnippetsRunNpmEvent) => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_029),
        'snippets',
        'Spawning helper',
        ev
      );
    });

    onBus('mongosh-snippets:load-snippet', (ev: SnippetsLoadSnippetEvent) => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_030),
        'snippets',
        'Loading snippet',
        ev
      );
    });

    onBus('mongosh-snippets:snippet-command', (ev: SnippetsCommandEvent) => {
      this.log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_031),
        'snippets',
        'Running snippet command',
        ev
      );

      if (ev.args[0] === 'install') {
        track({
          event: 'Snippet Install',
        });
      }
    });

    onBus(
      'mongosh-snippets:transform-error',
      (ev: SnippetsTransformErrorEvent) => {
        this.log.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_032),
          'snippets',
          'Rewrote error message',
          ev
        );
      }
    );

    onBus('mongosh:api-call', (ev: ApiEvent) => {
      // Only track if we have previously seen a mongosh:evaluate-started call
      if (!this.busEventState.apiCallTracking.isEnabled) return;
      const { apiCalls, deprecatedApiCalls } =
        this.busEventState.apiCallTracking;
      if (ev.deprecated) {
        deprecatedApiCalls.add({ class: ev.class, method: ev.method });
      }
      if (ev.callDepth === 0 && ev.isAsync) {
        apiCalls.add({ class: ev.class, method: ev.method });
      }
    });
    onBus('mongosh:evaluate-started', () => {
      const { apiCalls, deprecatedApiCalls } =
        this.busEventState.apiCallTracking;
      this.busEventState.apiCallTracking.isEnabled = true;
      // Clear API calls before evaluation starts. This is important because
      // some API calls are also emitted by mongosh CLI repl internals,
      // but we only care about those emitted from user code (i.e. during
      // evaluation).
      deprecatedApiCalls.clear();
      apiCalls.clear();
    });
    onBus('mongosh:evaluate-finished', () => {
      const { apiCalls, deprecatedApiCalls } =
        this.busEventState.apiCallTracking;
      for (const [entry] of deprecatedApiCalls) {
        this.log.warn(
          'MONGOSH',
          mongoLogId(1_000_000_033),
          'shell-api',
          'Deprecated API call',
          entry
        );

        track({
          event: 'Deprecated Method',
          properties: {
            ...entry,
          },
        });
      }
      for (const [entry, count] of apiCalls) {
        track({
          event: 'API Call',
          properties: {
            ...entry,
            count,
          },
        });
      }
      deprecatedApiCalls.clear();
      apiCalls.clear();
      this.busEventState.apiCallTracking.isEnabled = false;
    });

    // Log ids 1_000_000_034 through 1_000_000_042 are reserved for the
    // devtools-connect package which was split out from mongosh.
    // 'mongodb' is not supported in startup snapshots yet.

    onBus('mongosh-sp:reset-connection-options', () => {
      this.log.info(
        'MONGOSH-SP',
        mongoLogId(1_000_000_040),
        'connect',
        'Reconnect because of changed connection options'
      );
    });

    onBus(
      'mongosh-editor:run-edit-command',
      (ev: EditorRunEditCommandEvent) => {
        this.log.error(
          'MONGOSH-EDITOR',
          mongoLogId(1_000_000_047),
          'editor',
          'Open external editor',
          redact(ev)
        );
      }
    );

    onBus(
      'mongosh-editor:read-vscode-extensions-done',
      (ev: EditorReadVscodeExtensionsDoneEvent) => {
        this.log.error(
          'MONGOSH-EDITOR',
          mongoLogId(1_000_000_043),
          'editor',
          'Reading vscode extensions from file system succeeded',
          ev
        );
      }
    );

    onBus(
      'mongosh-editor:read-vscode-extensions-failed',
      (ev: EditorReadVscodeExtensionsFailedEvent) => {
        this.log.error(
          'MONGOSH-EDITOR',
          mongoLogId(1_000_000_044),
          'editor',
          'Reading vscode extensions from file system failed',
          {
            ...ev,
            error: ev.error.message,
          }
        );
      }
    );

    onBus(
      'mongosh:fetching-update-metadata',
      (ev: FetchingUpdateMetadataEvent) => {
        this.log.info(
          'MONGOSH',
          mongoLogId(1_000_000_052),
          'startup',
          'Fetching update metadata',
          {
            ...ev,
          }
        );
      }
    );

    onBus(
      'mongosh:fetching-update-metadata-complete',
      (ev: FetchingUpdateMetadataCompleteEvent) => {
        this.log.info(
          'MONGOSH',
          mongoLogId(1_000_000_053),
          'startup',
          'Fetching update metadata complete',
          {
            ...ev,
          }
        );
      }
    );

    hookLogger(
      this.bus,
      {
        debug: (...args: Parameters<typeof this.log.debug>) => {
          return this.log.debug(...args);
        },
        info: (...args: Parameters<typeof this.log.info>) => {
          return this.log.info(...args);
        },
        warn: (...args: Parameters<typeof this.log.warn>) => {
          return this.log.warn(...args);
        },
        error: (...args: Parameters<typeof this.log.error>) => {
          return this.log.error(...args);
        },
        mongoLogId: (...args: Parameters<typeof this.log.mongoLogId>) => {
          return this.log.mongoLogId(...args);
        },
      },
      'mongosh',
      (uri) => redactConnectionString(uri)
    );
  }
}
