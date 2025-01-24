/* eslint prefer-arrow-callback: "error" */
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
} from '@mongosh/types';
import { inspect } from 'util';
import { MongoLogWriter } from 'mongodb-log-writer';
import { mongoLogId } from 'mongodb-log-writer';
import type {
  AnalyticsIdentifyMessage,
  MongoshAnalytics,
  MongoshAnalyticsIdentity,
} from './analytics-helpers';
import { hookLogger } from '@mongodb-js/devtools-connect';
import { MultiSet, toSnakeCase } from './helpers';
import { Writable } from 'stream';

export class MongoshLoggingAndTelemetry {
  log: MongoLogWriter;
  pendingLogEvents: CallableFunction[] = [];

  telemetryAnonymousId: string | undefined;
  userId: string | undefined;
  trackingProperties: {
    mongosh_version: string;
    session_id: string;
  };
  userTraits: AnalyticsIdentifyMessage['traits'] & {
    [key: string]: unknown;
  };

  isSetup = false;
  hasMongoLogWriterInitialized = false;

  constructor(
    public bus: MongoshBus,
    public analytics: MongoshAnalytics,
    public providedTraits: { platform: string } & {
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

  public setup() {
    this._setupBusEventListeners();
    this.isSetup = true;
  }

  public setupLogger(logger: MongoLogWriter) {
    if (!this.isSetup) {
      throw new Error('Run setup() before setting up the log writer.');
    }
    this.log = logger;

    this.userTraits.session_id = this.log.logId;
    this.trackingProperties.session_id = this.log.logId;
  }

  public getTelemetryUserIdentity = (): MongoshAnalyticsIdentity => ({
    anonymousId: this.telemetryAnonymousId ?? (this.userId as string),
  });

  /** Start processing pending events after mongosh:logger-initialized */
  private onLoggerInitialized() {
    this.hasMongoLogWriterInitialized = true;
    for (const pendingEvent of this.pendingLogEvents) {
      pendingEvent();
    }
    this.pendingLogEvents = [];

    hookLogger(this.bus, this.log, 'mongosh', (uri) =>
      redactURICredentials(uri)
    );
  }

  private _setupBusEventListeners() {
    this.bus.on(
      'mongosh:logger-initialized',
      this.onLoggerInitialized.bind(this)
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onBus = <T extends any[]>(
      event: keyof MongoshBusEventsMap,
      listener: (...args: T) => void
    ) => {
      this.bus.on(event, (...args: T) => {
        if (this.hasMongoLogWriterInitialized) {
          listener(...args);
        } else {
          this.pendingLogEvents.push(() => listener(...args));
        }
      });
    };

    // We emit different analytics events for loading files and evaluating scripts
    // depending on whether we're already in the REPL or not yet. We store the
    // state here so that the places where the events are emitted don't have to
    // be aware of this distinction.
    let hasStartedMongoshRepl = false;

    /* eslint prefer-arrow-callback: "error" */
    onBus('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_002),
        'repl',
        'Started REPL',
        ev
      );
      hasStartedMongoshRepl = true;
    });

    let usesShellOption = false;

    onBus(
      'mongosh:start-loading-cli-scripts',
      (event: StartLoadingCliScriptsEvent) => {
        this.log.info(
          'MONGOSH',
          mongoLogId(1_000_000_003),
          'repl',
          'Start loading CLI scripts'
        );
        usesShellOption = event.usesShellOption;
      }
    );

    onBus('mongosh:connect', (args: ConnectEvent) => {
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

      this.log.info(
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
        ...this.getTelemetryUserIdentity(),
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
      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: 'Startup Time',
        properties: {
          ...this.trackingProperties,
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
          this.userId = newTelemetryUserIdentity.userId;
        }
        this.telemetryAnonymousId = newTelemetryUserIdentity.anonymousId;
        this.analytics.identify({
          anonymousId: newTelemetryUserIdentity.anonymousId,
          traits: this.userTraits,
        });
      }
    );

    onBus(
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
          ...this.getTelemetryUserIdentity(),
          traits: this.userTraits,
        });
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
        this.analytics.track({
          ...this.getTelemetryUserIdentity(),
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

      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: 'Use',
        properties: {
          ...this.trackingProperties,
        },
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

      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: 'Show',
        properties: {
          ...this.trackingProperties,
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
        redactInfo(arg)
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

      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: hasStartedMongoshRepl ? 'Script Loaded' : 'Script Loaded CLI',
        properties: {
          ...this.trackingProperties,
          nested: args.nested,
          ...(hasStartedMongoshRepl ? {} : { shell: usesShellOption }),
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

      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: 'Script Evaluated',
        properties: {
          ...this.trackingProperties,
          shell: usesShellOption,
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

      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: 'Mongoshrc Loaded',
        properties: {
          ...this.trackingProperties,
        },
      });
    });

    onBus('mongosh:mongoshrc-mongorc-warn', () => {
      this.log.info(
        'MONGOSH',
        mongoLogId(1_000_000_015),
        'repl',
        'Warning about .mongorc.js/.mongoshrc.js mismatch'
      );

      this.analytics.track({
        ...this.getTelemetryUserIdentity(),
        event: 'Mongorc Warning',
        properties: {
          ...this.trackingProperties,
        },
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
        this.analytics.track({
          ...this.getTelemetryUserIdentity(),
          event: 'Snippet Install',
          properties: {
            ...this.trackingProperties,
          },
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

    const deprecatedApiCalls = new MultiSet<
      Pick<ApiEvent, 'class' | 'method'>
    >();
    const apiCalls = new MultiSet<Pick<ApiEvent, 'class' | 'method'>>();
    let apiCallTrackingEnabled = false;
    onBus('mongosh:api-call', (ev: ApiEvent) => {
      // Only track if we have previously seen a mongosh:evaluate-started call
      if (!apiCallTrackingEnabled) return;
      if (ev.deprecated) {
        deprecatedApiCalls.add({ class: ev.class, method: ev.method });
      }
      if (ev.callDepth === 0 && ev.isAsync) {
        apiCalls.add({ class: ev.class, method: ev.method });
      }
    });
    onBus('mongosh:evaluate-started', () => {
      apiCallTrackingEnabled = true;
      // Clear API calls before evaluation starts. This is important because
      // some API calls are also emitted by mongosh CLI repl internals,
      // but we only care about those emitted from user code (i.e. during
      // evaluation).
      deprecatedApiCalls.clear();
      apiCalls.clear();
    });
    onBus('mongosh:evaluate-finished', () => {
      for (const [entry] of deprecatedApiCalls) {
        this.log.warn(
          'MONGOSH',
          mongoLogId(1_000_000_033),
          'shell-api',
          'Deprecated API call',
          entry
        );

        this.analytics.track({
          ...this.getTelemetryUserIdentity(),
          event: 'Deprecated Method',
          properties: {
            ...this.trackingProperties,
            ...entry,
          },
        });
      }
      for (const [entry, count] of apiCalls) {
        this.analytics.track({
          ...this.getTelemetryUserIdentity(),
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
      apiCallTrackingEnabled = false;
    });

    // Log ids 1_000_000_034 through 1_000_000_042 are reserved for the
    // devtools-connect package which was split out from mongosh.
    // 'mongodb' is not supported in startup snapshots yet.
    // eslint-disable-next-line @typescript-eslint/no-var-requires

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
          redactInfo(ev)
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
  }
}
