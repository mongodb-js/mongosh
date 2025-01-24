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
import { MultiSet } from './multi-set';
import { Writable } from 'stream';

/**
 * It transforms a random string into snake case. Snake case is completely
 * lowercase and uses '_' to separate words. For example:
 *
 * This function defines a "word" as a sequence of characters until the next `.` or capital letter.
 *
 * 'Random String' => 'random_string'
 *
 * It will also remove any non alphanumeric characters to ensure the string
 * is compatible with Segment. For example:
 *
 * 'Node.js REPL Instantiation' => 'node_js_repl_instantiation'
 *
 * @param str Any non snake-case formatted string
 * @returns The snake-case formatted string
 */
export function toSnakeCase(str: string): string {
  const matches = str.match(
    /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
  );
  if (!matches) {
    return str;
  }

  return matches.map((x) => x.toLowerCase()).join('_');
}

/**
 * Connect a MongoshBus instance that emits events to logging and analytics providers.
 *
 * @param bus A MongoshBus instance
 * @param log A MongoLogWriter instance
 * @param makeAnalytics A function that returns an analytics provider (or throws otherwise)
 */
export function setupLoggerAndTelemetry(
  bus: MongoshBus,
  analytics: MongoshAnalytics,
  providedTraits: { platform: string } & {
    [key: string]: unknown;
  },
  mongosh_version: string
): {
  setMongoLogWriter: (logger: MongoLogWriter) => void;
} {
  const dummySink = new Writable({
    write(chunk, encoding, callback) {
      callback();
    },
  });
  let log = new MongoLogWriter({
    logId: '',
    logFilePath: null,
    target: dummySink,
  });

  function setMongoLogWriter(logger: MongoLogWriter) {
    log = logger;
  }

  const { logId: session_id } = log;
  let userId: string;
  let telemetryAnonymousId: string;
  let pendingLogEvents: CallableFunction[] = [];

  const userTraits: AnalyticsIdentifyMessage['traits'] & {
    [key: string]: unknown;
  } = {
    ...providedTraits,
    session_id,
  };

  let hasMongoLogWriterInitialized = false;

  bus.on('mongosh:log-initialized', () => {
    hasMongoLogWriterInitialized = true;
    for (const ev of pendingLogEvents) {
      ev();
    }
    pendingLogEvents = [];
  });

  const getTelemetryUserIdentity = (): MongoshAnalyticsIdentity => ({
    anonymousId: telemetryAnonymousId ?? userId,
  });
  const trackProperties = {
    mongosh_version,
    session_id,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function onBus<T extends any[]>(
    event: keyof MongoshBusEventsMap,
    listener: (...args: T) => void
  ) {
    bus.on(event, (...args: T) => {
      if (hasMongoLogWriterInitialized) {
        listener(...args);
      } else {
        pendingLogEvents.push(() => listener(...args));
      }
    });
  }

  // We emit different analytics events for loading files and evaluating scripts
  // depending on whether we're already in the REPL or not yet. We store the
  // state here so that the places where the events are emitted don't have to
  // be aware of this distinction.
  let hasStartedMongoshRepl = false;
  onBus('mongosh:start-mongosh-repl', (ev: StartMongoshReplEvent) => {
    log.info('MONGOSH', mongoLogId(1_000_000_002), 'repl', 'Started REPL', ev);
    hasStartedMongoshRepl = true;
  });

  let usesShellOption = false;

  onBus(
    'mongosh:start-loading-cli-scripts',
    (event: StartLoadingCliScriptsEvent) => {
      log.info(
        'MONGOSH',
        mongoLogId(1_000_000_003),
        'repl',
        'Start loading CLI scripts'
      );
      usesShellOption = event.usesShellOption;
    }
  );

  onBus('mongosh:connect', function (args: ConnectEvent) {
    const { uri, resolved_hostname, ...argsWithoutUriAndHostname } = args;
    const connectionUri = uri && redactURICredentials(uri);
    const atlasHostname = {
      atlas_hostname: args.is_atlas ? resolved_hostname : null,
    };
    const properties = {
      ...trackProperties,
      ...argsWithoutUriAndHostname,
      ...atlasHostname,
    };

    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_004),
      'connect',
      'Connecting to server',
      {
        userId,
        telemetryAnonymousId,
        connectionUri,
        ...properties,
      }
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'New Connection',
      properties,
    });
  });

  onBus('mongosh:start-session', function (args: SessionStartedEvent) {
    const normalisedTimingsArray = Object.entries(args.timings).map(
      ([key, duration]) => {
        const snakeCaseKey = toSnakeCase(key);
        return [snakeCaseKey, duration];
      }
    );

    const normalisedTimings = Object.fromEntries(normalisedTimingsArray);
    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Startup Time',
      properties: {
        ...trackProperties,
        is_interactive: args.isInteractive,
        js_context: args.jsContext,
        ...normalisedTimings,
      },
    });
  });

  onBus(
    'mongosh:new-user',
    function (newTelemetryUserIdentity: {
      userId: string;
      anonymousId: string;
    }) {
      if (!newTelemetryUserIdentity.anonymousId) {
        userId = newTelemetryUserIdentity.userId;
      }
      telemetryAnonymousId = newTelemetryUserIdentity.anonymousId;
      analytics.identify({
        anonymousId: newTelemetryUserIdentity.anonymousId,
        traits: userTraits,
      });
    }
  );

  onBus(
    'mongosh:update-user',
    function (updatedTelemetryUserIdentity: {
      userId: string;
      anonymousId?: string;
    }) {
      if (updatedTelemetryUserIdentity.anonymousId) {
        telemetryAnonymousId = updatedTelemetryUserIdentity.anonymousId;
      } else {
        userId = updatedTelemetryUserIdentity.userId;
      }
      analytics.identify({
        ...getTelemetryUserIdentity(),
        traits: userTraits,
      });
      log.info('MONGOSH', mongoLogId(1_000_000_005), 'config', 'User updated');
    }
  );

  onBus('mongosh:error', function (error: Error, context: string) {
    const mongoshError = error as {
      name: string;
      message: string;
      code: any;
      scope: any;
      metadata: any;
    };

    log[context === 'fatal' ? 'fatal' : 'error'](
      'MONGOSH',
      mongoLogId(1_000_000_006),
      context,
      `${mongoshError.name}: ${mongoshError.message}`,
      error
    );

    if (error.name.includes('Mongosh')) {
      analytics.track({
        ...getTelemetryUserIdentity(),
        event: 'Error',
        properties: {
          ...trackProperties,
          name: mongoshError.name,
          code: mongoshError.code,
          scope: mongoshError.scope,
          metadata: mongoshError.metadata,
        },
      });
    }
  });

  onBus(
    'mongosh:globalconfig-load',
    function (args: GlobalConfigFileLoadEvent) {
      log.info(
        'MONGOSH',
        mongoLogId(1_000_000_048),
        'config',
        'Loading global configuration file',
        args
      );
    }
  );

  onBus('mongosh:evaluate-input', function (args: EvaluateInputEvent) {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_007),
      'repl',
      'Evaluating input',
      args
    );
  });

  onBus('mongosh:use', function (args: UseEvent) {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_008),
      'shell-api',
      'Used "use" command',
      args
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Use',
      properties: {
        ...trackProperties,
      },
    });
  });

  onBus('mongosh:show', function (args: ShowEvent) {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_009),
      'shell-api',
      'Used "show" command',
      args
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Show',
      properties: {
        ...trackProperties,
        method: args.method,
      },
    });
  });

  onBus('mongosh:setCtx', function (args: ApiEventWithArguments) {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_010),
      'shell-api',
      'Initialized context',
      args
    );
  });

  onBus(
    'mongosh:api-call-with-arguments',
    function (args: ApiEventWithArguments) {
      // TODO: redactInfo cannot handle circular or otherwise nontrivial input
      let arg;
      try {
        arg = JSON.parse(JSON.stringify(args));
      } catch {
        arg = { _inspected: inspect(args) };
      }
      log.info(
        'MONGOSH',
        mongoLogId(1_000_000_011),
        'shell-api',
        'Performed API call',
        redactInfo(arg)
      );
    }
  );

  onBus('mongosh:api-load-file', function (args: ScriptLoadFileEvent) {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_012),
      'shell-api',
      'Loading file via load()',
      args
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: hasStartedMongoshRepl ? 'Script Loaded' : 'Script Loaded CLI',
      properties: {
        ...trackProperties,
        nested: args.nested,
        ...(hasStartedMongoshRepl ? {} : { shell: usesShellOption }),
      },
    });
  });

  onBus('mongosh:eval-cli-script', function () {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_013),
      'repl',
      'Evaluating script passed on the command line'
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Script Evaluated',
      properties: {
        ...trackProperties,
        shell: usesShellOption,
      },
    });
  });

  onBus('mongosh:mongoshrc-load', function () {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_014),
      'repl',
      'Loading .mongoshrc.js'
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Mongoshrc Loaded',
      properties: {
        ...trackProperties,
      },
    });
  });

  onBus('mongosh:mongoshrc-mongorc-warn', function () {
    log.info(
      'MONGOSH',
      mongoLogId(1_000_000_015),
      'repl',
      'Warning about .mongorc.js/.mongoshrc.js mismatch'
    );

    analytics.track({
      ...getTelemetryUserIdentity(),
      event: 'Mongorc Warning',
      properties: {
        ...trackProperties,
      },
    });
  });

  onBus(
    'mongosh:crypt-library-load-skip',
    function (ev: CryptLibrarySkipEvent) {
      log.info(
        'AUTO-ENCRYPTION',
        mongoLogId(1_000_000_050),
        'crypt-library',
        'Skipping shared library candidate',
        ev
      );
    }
  );

  onBus(
    'mongosh:crypt-library-load-found',
    function (ev: CryptLibraryFoundEvent) {
      log.warn(
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

  onBus('mongosh-snippets:loaded', function (ev: SnippetsLoadedEvent) {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_019),
      'snippets',
      'Loaded snippets',
      ev
    );
  });

  onBus('mongosh-snippets:npm-lookup', function (ev: SnippetsNpmLookupEvent) {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_020),
      'snippets',
      'Performing npm lookup',
      ev
    );
  });

  onBus('mongosh-snippets:npm-lookup-stopped', function () {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_021),
      'snippets',
      'npm lookup stopped'
    );
  });

  onBus(
    'mongosh-snippets:npm-download-failed',
    function (ev: SnippetsNpmDownloadFailedEvent) {
      log.info(
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
    function (ev: SnippetsNpmDownloadActiveEvent) {
      log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_023),
        'snippets',
        'npm download active',
        ev
      );
    }
  );

  onBus('mongosh-snippets:fetch-index', function (ev: SnippetsFetchIndexEvent) {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_024),
      'snippets',
      'Fetching snippet index',
      ev
    );
  });

  onBus('mongosh-snippets:fetch-cache-invalid', function () {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_025),
      'snippets',
      'Snippet cache invalid'
    );
  });

  onBus(
    'mongosh-snippets:fetch-index-error',
    function (ev: SnippetsFetchIndexErrorEvent) {
      log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_026),
        'snippets',
        'Fetching snippet index failed',
        ev
      );
    }
  );

  onBus('mongosh-snippets:fetch-index-done', function () {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_027),
      'snippets',
      'Fetching snippet index done'
    );
  });

  onBus(
    'mongosh-snippets:package-json-edit-error',
    function (ev: SnippetsErrorEvent) {
      log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_028),
        'snippets',
        'Modifying snippets package.json failed',
        ev
      );
    }
  );

  onBus('mongosh-snippets:spawn-child', function (ev: SnippetsRunNpmEvent) {
    log.info(
      'MONGOSH-SNIPPETS',
      mongoLogId(1_000_000_029),
      'snippets',
      'Spawning helper',
      ev
    );
  });

  onBus(
    'mongosh-snippets:load-snippet',
    function (ev: SnippetsLoadSnippetEvent) {
      log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_030),
        'snippets',
        'Loading snippet',
        ev
      );
    }
  );

  onBus(
    'mongosh-snippets:snippet-command',
    function (ev: SnippetsCommandEvent) {
      log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_031),
        'snippets',
        'Running snippet command',
        ev
      );

      if (ev.args[0] === 'install') {
        analytics.track({
          ...getTelemetryUserIdentity(),
          event: 'Snippet Install',
          properties: {
            ...trackProperties,
          },
        });
      }
    }
  );

  onBus(
    'mongosh-snippets:transform-error',
    function (ev: SnippetsTransformErrorEvent) {
      log.info(
        'MONGOSH-SNIPPETS',
        mongoLogId(1_000_000_032),
        'snippets',
        'Rewrote error message',
        ev
      );
    }
  );

  const deprecatedApiCalls = new MultiSet<Pick<ApiEvent, 'class' | 'method'>>();
  const apiCalls = new MultiSet<Pick<ApiEvent, 'class' | 'method'>>();
  let apiCallTrackingEnabled = false;
  onBus('mongosh:api-call', function (ev: ApiEvent) {
    // Only track if we have previously seen a mongosh:evaluate-started call
    if (!apiCallTrackingEnabled) return;
    if (ev.deprecated) {
      deprecatedApiCalls.add({ class: ev.class, method: ev.method });
    }
    if (ev.callDepth === 0 && ev.isAsync) {
      apiCalls.add({ class: ev.class, method: ev.method });
    }
  });
  onBus('mongosh:evaluate-started', function () {
    apiCallTrackingEnabled = true;
    // Clear API calls before evaluation starts. This is important because
    // some API calls are also emitted by mongosh CLI repl internals,
    // but we only care about those emitted from user code (i.e. during
    // evaluation).
    deprecatedApiCalls.clear();
    apiCalls.clear();
  });
  onBus('mongosh:evaluate-finished', function () {
    for (const [entry] of deprecatedApiCalls) {
      log.warn(
        'MONGOSH',
        mongoLogId(1_000_000_033),
        'shell-api',
        'Deprecated API call',
        entry
      );

      analytics.track({
        ...getTelemetryUserIdentity(),
        event: 'Deprecated Method',
        properties: {
          ...trackProperties,
          ...entry,
        },
      });
    }
    for (const [entry, count] of apiCalls) {
      analytics.track({
        ...getTelemetryUserIdentity(),
        event: 'API Call',
        properties: {
          ...trackProperties,
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
  hookLogger(bus, log, 'mongosh', redactURICredentials);

  onBus('mongosh-sp:reset-connection-options', function () {
    log.info(
      'MONGOSH-SP',
      mongoLogId(1_000_000_040),
      'connect',
      'Reconnect because of changed connection options'
    );
  });

  onBus(
    'mongosh-editor:run-edit-command',
    function (ev: EditorRunEditCommandEvent) {
      log.error(
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
    function (ev: EditorReadVscodeExtensionsDoneEvent) {
      log.error(
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
    function (ev: EditorReadVscodeExtensionsFailedEvent) {
      log.error(
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
    function (ev: FetchingUpdateMetadataEvent) {
      log.info(
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
    function (ev: FetchingUpdateMetadataCompleteEvent) {
      log.info(
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

  // NB: mongoLogId(1_000_000_045) is used in cli-repl itself
  // NB: mongoLogId(1_000_000_034) through mongoLogId(1_000_000_042) are used in devtools-connect
  // NB: mongoLogId(1_000_000_049) is used in devtools-connect

  return { setMongoLogWriter };
}
