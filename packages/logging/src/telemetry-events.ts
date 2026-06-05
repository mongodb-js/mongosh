/**
 * Properties automatically included in every `track()` call.
 */
export interface MongoshCommonEventProperties {
  /** The version of mongosh that emitted the event. */
  mongosh_version: string;
  /** Unique identifier for the current mongosh session. */
  session_id: string;
}

/**
 * Traits sent with an `identify()` call to associate a user profile.
 *
 * @category Identity
 */
export interface MongoshIdentifyTraits {
  /** The OS platform (e.g. `"darwin"`, `"linux"`, `"win32"`). */
  platform: string;
  /** A persistent, machine-specific identifier. */
  device_id: string;
  /** Unique identifier for the current mongosh session. */
  session_id: string;
}

/**
 * Emitted when mongosh establishes a new connection to a MongoDB server.
 *
 * Fired on bus event: `mongosh:connect`
 *
 * @category Connection
 */
export interface NewConnectionEvent {
  name: 'New Connection';
  properties: {
    /** Whether the server is an Atlas deployment. */
    is_atlas?: boolean;
    /** Whether the server is running on localhost. */
    is_localhost?: boolean;
    /** Whether the connection URL follows the DigitalOcean format. */
    is_do_url?: boolean;
    /** The MongoDB server version string. */
    server_version?: string;
    /** The OS on which the server is running. */
    server_os?: string;
    /** The CPU architecture of the server. */
    server_arch?: string;
    /** Whether the server is an Enterprise edition. */
    is_enterprise?: boolean;
    /** The authentication mechanism used (e.g. `"DEFAULT"`, `"SCRAM-SHA-256"`). */
    auth_type?: string;
    /** Whether the server is Atlas Data Federation. */
    is_data_federation?: boolean;
    /** Whether the server is Atlas Stream Processing. */
    is_stream?: boolean;
    /** The MongoDB Shared Library (CSFLE) version. */
    dl_version?: string;
    /** The Atlas version. */
    atlas_version?: string;
    /** Whether the server is a genuine MongoDB server. */
    is_genuine?: boolean;
    /** The server name when it is not a genuine MongoDB server. */
    non_genuine_server_name?: string;
    /** The MongoDB Versioned API version string. */
    api_version?: string;
    /** Whether the MongoDB Versioned API strict mode is enabled. */
    api_strict?: boolean;
    /** Whether the MongoDB Versioned API deprecation errors are enabled. */
    api_deprecation_errors?: boolean;
    /** The Node.js version used by mongosh. */
    node_version?: string;
    /** Whether the server is a local Atlas deployment. */
    is_local_atlas?: boolean;
    /** Whether the connection URL follows the Atlas URL format. */
    is_atlas_url?: boolean;
    /** The Atlas hostname; present only for Atlas connections, `null` otherwise. */
    atlas_hostname: string | null;
  };
}

/**
 * Emitted once per session with startup timing breakdown.
 *
 * Fired on bus event: `mongosh:start-session`
 *
 * @category Connection
 */
export interface StartupTimeEvent {
  name: 'Startup Time';
  properties: {
    /** Whether mongosh was started in interactive (REPL) mode. */
    is_interactive: boolean;
    /** The JavaScript context used by the shell (e.g. `"repl"`, `"plain-vm"`). */
    js_context: string;
    /** Duration in milliseconds for each startup phase; key names are snake_case and vary. */
    [timingKey: string]: number | boolean | string;
  };
}

/**
 * Emitted when a Mongosh-specific error is thrown.
 *
 * Fired on bus event: `mongosh:error` (only for errors whose `name` includes `"Mongosh"`)
 *
 * @category Errors
 */
export interface ErrorEvent {
  name: 'Error';
  properties: {
    /** The error class name (e.g. `"MongoshInvalidInputError"`). */
    name: string;
    /** The mongosh error code. */
    code: unknown;
    /** The scope in which the error was raised. */
    scope: unknown;
    /** Additional metadata attached to the error. */
    metadata: unknown;
  };
}

/**
 * Emitted when the user runs the `use <db>` command.
 *
 * Fired on bus event: `mongosh:use`
 *
 * @category Shell
 */
export interface UseEvent {
  name: 'Use';
}

/**
 * Emitted when the user runs a `show` command (e.g. `show dbs`, `show collections`).
 *
 * Fired on bus event: `mongosh:show`
 *
 * @category Shell
 */
export interface ShowEvent {
  name: 'Show';
  properties: {
    /** The `show` sub-command that was invoked (e.g. `"dbs"`, `"collections"`). */
    method: string;
  };
}

/**
 * Emitted when a script file is loaded via `load()` while the REPL is already running.
 *
 * Fired on bus event: `mongosh:api-load-file` (after the REPL has started)
 *
 * @category Shell
 */
export interface ScriptLoadedEvent {
  name: 'Script Loaded';
  properties: {
    /** Whether the script was loaded as a nested `load()` call from within another script. */
    nested: boolean;
  };
}

/**
 * Emitted when a script file is loaded before the REPL starts (e.g. via `--file`).
 *
 * Fired on bus event: `mongosh:api-load-file` (before the REPL has started)
 *
 * @category Shell
 */
export interface ScriptLoadedCliEvent {
  name: 'Script Loaded CLI';
  properties: {
    /** Whether the script was loaded as a nested `load()` call from within another script. */
    nested: boolean;
    /** Whether mongosh was invoked with the `--shell` flag. */
    shell: boolean;
  };
}

/**
 * Emitted when a script is passed directly on the command line and evaluated.
 *
 * Fired on bus event: `mongosh:eval-cli-script`
 *
 * @category Shell
 */
export interface ScriptEvaluatedEvent {
  name: 'Script Evaluated';
  properties: {
    /** Whether mongosh was invoked with the `--shell` flag. */
    shell: boolean;
  };
}

/**
 * Emitted when `.mongoshrc.js` is loaded at startup.
 *
 * Fired on bus event: `mongosh:mongoshrc-load`
 *
 * @category Shell
 */
export interface MongoshrcLoadedEvent {
  name: 'Mongoshrc Loaded';
}

/**
 * Emitted when a legacy `.mongorc.js` file is detected and a migration warning is shown.
 *
 * Fired on bus event: `mongosh:mongoshrc-mongorc-warn`
 *
 * @category Shell
 */
export interface MongorcWarningEvent {
  name: 'Mongorc Warning';
}

/**
 * Emitted when a snippet is installed via the `snippet install` command.
 *
 * Fired on bus event: `mongosh-snippets:snippet-command` (only for `install` sub-commands)
 *
 * @category Snippets
 */
export interface SnippetInstallEvent {
  name: 'Snippet Install';
}

/**
 * Emitted once per top-level user evaluation for each distinct async API method called.
 *
 * Fired on bus event: `mongosh:evaluate-finished`
 *
 * @category API
 */
export interface ApiCallEvent {
  name: 'API Call';
  properties: {
    /** The shell API class name (e.g. `"Collection"`, `"Database"`). */
    class: string;
    /** The method name (e.g. `"find"`, `"insertOne"`). */
    method: string;
    /** The number of times this method was called during the current evaluation. */
    count: number;
  };
}

/**
 * Emitted when a deprecated shell API method is called.
 *
 * Fired on bus event: `mongosh:evaluate-finished`
 *
 * @category API
 */
export interface DeprecatedMethodEvent {
  name: 'Deprecated Method';
  properties: {
    /** The shell API class that contains the deprecated method. */
    class: string;
    /** The deprecated method name. */
    method: string;
  };
}

/**
 * Union of all analytics events tracked by mongosh.
 */
export type MongoshTelemetryEvent =
  | NewConnectionEvent
  | StartupTimeEvent
  | ErrorEvent
  | UseEvent
  | ShowEvent
  | ScriptLoadedEvent
  | ScriptLoadedCliEvent
  | ScriptEvaluatedEvent
  | MongoshrcLoadedEvent
  | MongorcWarningEvent
  | SnippetInstallEvent
  | ApiCallEvent
  | DeprecatedMethodEvent;
