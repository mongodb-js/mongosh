import redactInfo from 'mongodb-redact';
import { redactURICredentials } from '@mongosh/history';
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
  MongoshAnalytics,
  MongoshAnalyticsIdentity,
} from './analytics-helpers';
import type { ConnectEventMap } from '@mongodb-js/devtools-connect';
import { hookLogger } from '@mongodb-js/devtools-connect';
import { MultiSet, toSnakeCase } from './helpers';
import { Writable } from 'stream';

export class MongoshLoggingAndTelemetry {
  private log: MongoLogWriter | null;

  private readonly trackingProperties: {
    mongosh_version: string;
    session_id: string;
  };
  private readonly userTraits: AnalyticsIdentifyMessage['traits'] & {
    [key: string]: unknown;
  };

  private pendingLogEvents: CallableFunction[] = [];

  private telemetryAnonymousId: string | undefined;
  private userId: string | undefined;
  private isDummyLog = true;
  private isSetup = false;
  private hookedExternalListenersLogId: string | undefined = undefined;

  constructor(
    private readonly bus: MongoshBus,
    private readonly analytics: MongoshAnalytics,
    providedTraits: { platform: string } & {
      [key: string]: unknown;
    },
    mongoshVersion: string
  ) {
    const dummySink = new Writable({
      write(chunk, encoding, callback) {
        callback();
      },
    });
    this.log = new MongoLogWriter('', null, dummySink);

    this.userTraits = {
      ...providedTraits,
      session_id: this.log.logId,
    };

    this.trackingProperties = {
      mongosh_version: mongoshVersion,
      session_id: this.log.logId,
    };
  }

  public setup(): void {
    if (this.isSetup) {
      throw new Error('Setup can only be called once.');
    }
    this._setupBusEventListeners();
    this.isSetup = true;
  }

  onBus = <
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
    listener: (...args: Parameters<EventsMap[K]>) => void,
    {
      /**
       * This is used to suppress externally defined listeners which
       * only emit log events such as those from devtools-connect.
       */
      suppressWhenLogIsNullOrDummy = false,
    } = {}
  ) => {
    this.bus.on(event, ((...args: Parameters<EventsMap[K]>) => {
      if (
        (this.log === null || this.isDummyLog) &&
        suppressWhenLogIsNullOrDummy
      ) {
        return;
      }

      const isLoggerAttachedOrNull =
        (this.log && !this.isDummyLog) || this.log === null;
      if (isLoggerAttachedOrNull) {
        listener(...args);
      } else {
        this.pendingLogEvents.push(() => listener(...args));
      }
    }) as MongoshBusEventsMap[K]);
    return this.bus;
  };

  public attachLogger(logger: MongoLogWriter): void {
    if (!this.isSetup) {
      throw new Error('Run setup() before setting up the log writer.');
    }
    /** Setup can only be run when overriding a dummy log or a null log. */
    if (this.log && !this.isDummyLog) {
      throw new Error(
        'Previously set logger has not been detached. Run detachLogger() before setting.'
      );
    }
    this.log = logger;

    this.userTraits.session_id = this.log.logId;
    this.trackingProperties.session_id = this.log.logId;

    this.isDummyLog = false;
    if (this.hookedExternalListenersLogId !== this.log.logId) {
      hookLogger(
        {
          ...this.bus,
          on: (event, listener) =>
            this.onBus<MongoshBusEventsMap, keyof ConnectEventMap>(
              event,
              listener as (...args: unknown[]) => void,
              { suppressWhenLogIsNullOrDummy: true }
            ),
        },
        this.log,
        'mongosh',
        (uri) => redactURICredentials(uri)
      );

      this.hookedExternalListenersLogId = this.log.logId;
    }

    this.runAndCleanPendingEvents();

    this.bus.emit('mongosh:log-initialized');
  }

  public detachLogger() {
    this.log = null;
    // Still run any remaining pending events for telemetry purposes.
    this.runAndCleanPendingEvents();
  }

  private runAndCleanPendingEvents() {
    for (const pendingEvent of this.pendingLogEvents) {
      pendingEvent();
    }
    this.pendingLogEvents = [];
  }

  private _getTelemetryUserIdentity(): MongoshAnalyticsIdentity {
    return {
      anonymousId: this.telemetryAnonymousId ?? (this.userId as string),
    };
  }

  /** We emit different analytics events for loading files and evaluating scripts
   * depending on whether we're already in the REPL or not yet. We store the
   * state here so that the places where the events are emitted don't have to
   * be aware of this distinction. */
  private hasStartedMongoshRepl = false;

  private apiCallTracking = {
    isEnabled: false,
    apiCalls: new MultiSet<Pick<ApiEvent, 'class' | 'method'>>(),
    deprecatedApiCalls: new MultiSet<Pick<ApiEvent, 'class' | 'method'>>(),
  };
  private usesShellOption = false;

  private _setupBusEventListeners(): void {
    this.onBus('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_002),
        'repl',
        'Started REPL',
        ev
      );
      this.hasStartedMongoshRepl = true;
    });

    this.onBus(
      'mongosh:start-loading-cli-scripts',
      (event: StartLoadingCliScriptsEvent) => {
        this.log?.info(
          'MONGOSH',
          mongoLogId(1_000_000_003),
          'repl',
          'Start loading CLI scripts'
        );
        this.usesShellOption = event.usesShellOption;
      }
    );

    this.onBus('mongosh:connect', (args: ConnectEvent) => {
      const { uri, resolved_hostname, ...argsWithoutUriAndHostname } = args;
      const connectionUri = uri && redactURICredentials(uri);
      const atlasHostname = {
        atlas_hostname: args.is_atlas ? resolved_hostname : null,
      };
      const properties = {
        ...this.trackingProperties,
        ...argsWithoutUriAndHostname,
        ...atlasHostname,
      };

      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_004),
        'connect',
        'Connecting to server',
        {
          userId: this.userId,
          telemetryAnonymousId: this.telemetryAnonymousId,
          connectionUri,
          ...properties,
        }
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'New Connection',
        properties,
      });
    });

    this.onBus('mongosh:start-session', (args: SessionStartedEvent) => {
      const normalizedTimingsArray = Object.entries(args.timings).map(
        ([key, duration]) => {
          const snakeCaseKey = toSnakeCase(key);
          return [snakeCaseKey, duration];
        }
      );

      const normalizedTimings = Object.fromEntries(normalizedTimingsArray);
      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'Startup Time',
        properties: {
          ...this.trackingProperties,
          is_interactive: args.isInteractive,
          js_context: args.jsContext,
          ...normalizedTimings,
        },
      });
    });

    this.onBus(
      'mongosh:new-user',
      (newTelemetryUserIdentity: { userId: string; anonymousId: string }) => {
        if (!newTelemetryUserIdentity.anonymousId) {
          this.userId = newTelemetryUserIdentity.userId;
        }
        this.telemetryAnonymousId = newTelemetryUserIdentity.anonymousId;
        this.analytics.identify({
          anonymousId: newTelemetryUserIdentity.anonymousId,
          traits: this.userTraits,
        });
      }
    );

    this.onBus(
      'mongosh:update-user',
      (updatedTelemetryUserIdentity: {
        userId: string;
        anonymousId?: string;
      }) => {
        if (updatedTelemetryUserIdentity.anonymousId) {
          this.telemetryAnonymousId = updatedTelemetryUserIdentity.anonymousId;
        } else {
          this.userId = updatedTelemetryUserIdentity.userId;
        }
        this.analytics.identify({
          ...this._getTelemetryUserIdentity(),
          traits: this.userTraits,
        });
        this.log?.info(
          'MONGOSH',
          mongoLogId(1_000_000_005),
          'config',
          'User updated'
        );
      }
    );

    this.onBus('mongosh:error', (error: Error, context: string) => {
      const mongoshError = error as {
        name: string;
        message: string;
        code: unknown;
        scope: unknown;
        metadata: unknown;
      };

      if (this.log) {
        this.log[context === 'fatal' ? 'fatal' : 'error'](
          'MONGOSH',
          mongoLogId(1_000_000_006),
          context,
          `${mongoshError.name}: ${mongoshError.message}`,
          error
        );
      }

      if (error.name.includes('Mongosh')) {
        this.analytics.track({
          ...this._getTelemetryUserIdentity(),
          event: 'Error',
          properties: {
            ...this.trackingProperties,
            name: mongoshError.name,
            code: mongoshError.code,
            scope: mongoshError.scope,
            metadata: mongoshError.metadata,
          },
        });
      }
    });

    this.onBus('mongosh:write-custom-log', (event: WriteCustomLogEvent) => {
      if (this.log) {
        this.log[event.method](
          'MONGOSH-SCRIPTS',
          mongoLogId(1_000_000_054),
          'custom-log',
          event.message,
          event.attr,
          event.level
        );
      }
    });

    this.onBus(
      'mongosh:globalconfig-load',
      (args: GlobalConfigFileLoadEvent) => {
        this.log?.info(
          'MONGOSH',
          mongoLogId(1_000_000_048),
          'config',
          'Loading global configuration file',
          args
        );
      }
    );

    this.onBus('mongosh:evaluate-input', (args: EvaluateInputEvent) => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_007),
        'repl',
        'Evaluating input',
        args
      );
    });

    this.onBus('mongosh:use', (args: UseEvent) => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_008),
        'shell-api',
        'Used "use" command',
        args
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'Use',
        properties: {
          ...this.trackingProperties,
        },
      });
    });

    this.onBus('mongosh:show', (args: ShowEvent) => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_009),
        'shell-api',
        'Used "show" command',
        args
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'Show',
        properties: {
          ...this.trackingProperties,
          method: args.method,
        },
      });
    });

    this.onBus('mongosh:setCtx', (args: ApiEventWithArguments) => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_010),
        'shell-api',
        'Initialized context',
        args
      );
    });

    this.onBus(
      'mongosh:api-call-with-arguments',
      (args: ApiEventWithArguments) => {
        // TODO: redactInfo cannot handle circular or otherwise nontrivial input
        let arg;
        try {
          arg = JSON.parse(JSON.stringify(args));
        } catch {
          arg = { _inspected: inspect(args) };
        }
        this.log?.info(
          'MONGOSH',
          mongoLogId(1_000_000_011),
          'shell-api',
          'Performed API call',
          redactInfo(arg)
        );
      }
    );

    this.onBus('mongosh:api-load-file', (args: ScriptLoadFileEvent) => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_012),
        'shell-api',
        'Loading file via load()',
        args
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: this.hasStartedMongoshRepl
          ? 'Script Loaded'
          : 'Script Loaded CLI',
        properties: {
          ...this.trackingProperties,
          nested: args.nested,
          ...(this.hasStartedMongoshRepl
            ? {}
            : { shell: this.usesShellOption }),
        },
      });
    });

    this.onBus('mongosh:eval-cli-script', () => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_013),
        'repl',
        'Evaluating script passed on the command line'
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'Script Evaluated',
        properties: {
          ...this.trackingProperties,
          shell: this.usesShellOption,
        },
      });
    });

    this.onBus('mongosh:mongoshrc-load', () => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_014),
        'repl',
        'Loading .mongoshrc.js'
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'Mongoshrc Loaded',
        properties: {
          ...this.trackingProperties,
        },
      });
    });

    this.onBus('mongosh:mongoshrc-mongorc-warn', () => {
      this.log?.info(
        'MONGOSH',
        mongoLogId(1_000_000_015),
        'repl',
        'Warning about .mongorc.js/.mongoshrc.js mismatch'
      );

      this.analytics.track({
        ...this._getTelemetryUserIdentity(),
        event: 'Mongorc Warning',
        properties: {
          ...this.trackingProperties,
        },
      });
    });

    this.onBus(
      'mongosh:crypt-library-load-skip',
      (ev: CryptLibrarySkipEvent) => {
        this.log?.info(
          'AUTO-ENCRYPTION',
          mongoLogId(1_000_000_050),
          'crypt-library',
          'Skipping shared library candidate',
          ev
        );
      }
    );

    this.onBus(
      'mongosh:crypt-library-load-found',
      (ev: CryptLibraryFoundEvent) => {
        this.log?.warn(
          'AUTO-ENCRYPTION',
          mongoLogId(1_000_000_051),
          'crypt-library',
          'Accepted shared library candidate',
          {
            cryptSharedLibPath: ev.cryptSharedLibPath,
            expectedVersion: ev.expectedVersion.versionStr,
          }
        );
      }
    );

    this.onBus('mongosh-snippets:loaded', (ev: SnippetsLoadedEvent) => {
      this.log?.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_019),
        'snippets',
        'Loaded snippets',
        ev
      );
    });

    this.onBus('mongosh-snippets:npm-lookup', (ev: SnippetsNpmLookupEvent) => {
      this.log?.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_020),
        'snippets',
        'Performing npm lookup',
        ev
      );
    });

    this.onBus('mongosh-snippets:npm-lookup-stopped', () => {
      this.log?.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_021),
        'snippets',
        'npm lookup stopped'
      );
    });

    this.onBus(
      'mongosh-snippets:npm-download-failed',
      (ev: SnippetsNpmDownloadFailedEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_022),
          'snippets',
          'npm download failed',
          ev
        );
      }
    );

    this.onBus(
      'mongosh-snippets:npm-download-active',
      (ev: SnippetsNpmDownloadActiveEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_023),
          'snippets',
          'npm download active',
          ev
        );
      }
    );

    this.onBus(
      'mongosh-snippets:fetch-index',
      (ev: SnippetsFetchIndexEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_024),
          'snippets',
          'Fetching snippet index',
          ev
        );
      }
    );

    this.onBus('mongosh-snippets:fetch-cache-invalid', () => {
      this.log?.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_025),
        'snippets',
        'Snippet cache invalid'
      );
    });

    this.onBus(
      'mongosh-snippets:fetch-index-error',
      (ev: SnippetsFetchIndexErrorEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_026),
          'snippets',
          'Fetching snippet index failed',
          ev
        );
      }
    );

    this.onBus('mongosh-snippets:fetch-index-done', () => {
      this.log?.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_027),
        'snippets',
        'Fetching snippet index done'
      );
    });
    this.onBus(
      'mongosh-snippets:package-json-edit-error',
      (ev: SnippetsErrorEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_028),
          'snippets',
          'Modifying snippets package.json failed',
          ev
        );
      }
    );

    this.onBus('mongosh-snippets:spawn-child', (ev: SnippetsRunNpmEvent) => {
      this.log?.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_029),
        'snippets',
        'Spawning helper',
        ev
      );
    });

    this.onBus(
      'mongosh-snippets:load-snippet',
      (ev: SnippetsLoadSnippetEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_030),
          'snippets',
          'Loading snippet',
          ev
        );
      }
    );

    this.onBus(
      'mongosh-snippets:snippet-command',
      (ev: SnippetsCommandEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_031),
          'snippets',
          'Running snippet command',
          ev
        );

        if (ev.args[0] === 'install') {
          this.analytics.track({
            ...this._getTelemetryUserIdentity(),
            event: 'Snippet Install',
            properties: {
              ...this.trackingProperties,
            },
          });
        }
      }
    );

    this.onBus(
      'mongosh-snippets:transform-error',
      (ev: SnippetsTransformErrorEvent) => {
        this.log?.info(
          'MONGOSH-SNIPPETS',
          mongoLogId(1_000_000_032),
          'snippets',
          'Rewrote error message',
          ev
        );
      }
    );

    this.onBus('mongosh:api-call', (ev: ApiEvent) => {
      // Only track if we have previously seen a mongosh:evaluate-started call
      if (!this.apiCallTracking.isEnabled) return;
      const { apiCalls, deprecatedApiCalls } = this.apiCallTracking;
      if (ev.deprecated) {
        deprecatedApiCalls.add({ class: ev.class, method: ev.method });
      }
      if (ev.callDepth === 0 && ev.isAsync) {
        apiCalls.add({ class: ev.class, method: ev.method });
      }
    });
    this.onBus('mongosh:evaluate-started', () => {
      const { apiCalls, deprecatedApiCalls } = this.apiCallTracking;
      this.apiCallTracking.isEnabled = true;
      // Clear API calls before evaluation starts. This is important because
      // some API calls are also emitted by mongosh CLI repl internals,
      // but we only care about those emitted from user code (i.e. during
      // evaluation).
      deprecatedApiCalls.clear();
      apiCalls.clear();
    });
    this.onBus('mongosh:evaluate-finished', () => {
      const { apiCalls, deprecatedApiCalls } = this.apiCallTracking;
      for (const [entry] of deprecatedApiCalls) {
        this.log?.warn(
          'MONGOSH',
          mongoLogId(1_000_000_033),
          'shell-api',
          'Deprecated API call',
          entry
        );

        this.analytics.track({
          ...this._getTelemetryUserIdentity(),
          event: 'Deprecated Method',
          properties: {
            ...this.trackingProperties,
            ...entry,
          },
        });
      }
      for (const [entry, count] of apiCalls) {
        this.analytics.track({
          ...this._getTelemetryUserIdentity(),
          event: 'API Call',
          properties: {
            ...this.trackingProperties,
            ...entry,
            count,
          },
        });
      }
      deprecatedApiCalls.clear();
      apiCalls.clear();
      this.apiCallTracking.isEnabled = false;
    });

    // Log ids 1_000_000_034 through 1_000_000_042 are reserved for the
    // devtools-connect package which was split out from mongosh.
    // 'mongodb' is not supported in startup snapshots yet.

    this.onBus('mongosh-sp:reset-connection-options', () => {
      this.log?.info(
        'MONGOSH-SP',
        mongoLogId(1_000_000_040),
        'connect',
        'Reconnect because of changed connection options'
      );
    });

    this.onBus(
      'mongosh-editor:run-edit-command',
      (ev: EditorRunEditCommandEvent) => {
        this.log?.error(
          'MONGOSH-EDITOR',
          mongoLogId(1_000_000_047),
          'editor',
          'Open external editor',
          redactInfo(ev)
        );
      }
    );

    this.onBus(
      'mongosh-editor:read-vscode-extensions-done',
      (ev: EditorReadVscodeExtensionsDoneEvent) => {
        this.log?.error(
          'MONGOSH-EDITOR',
          mongoLogId(1_000_000_043),
          'editor',
          'Reading vscode extensions from file system succeeded',
          ev
        );
      }
    );

    this.onBus(
      'mongosh-editor:read-vscode-extensions-failed',
      (ev: EditorReadVscodeExtensionsFailedEvent) => {
        this.log?.error(
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

    this.onBus(
      'mongosh:fetching-update-metadata',
      (ev: FetchingUpdateMetadataEvent) => {
        this.log?.info(
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

    this.onBus(
      'mongosh:fetching-update-metadata-complete',
      (ev: FetchingUpdateMetadataCompleteEvent) => {
        this.log?.info(
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
  }
}
