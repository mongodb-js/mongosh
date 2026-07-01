/**
 * Emitted once per session at startup to associate device and OS traits with the session.
 *
 * @category Session
 */
export interface IdentifyEvent {
  name: 'Identify';
  payload: {
    /** The version of mongosh that emitted the event. */
    mongosh_version: string;
    /** AI agent identifier if the session was initiated by an AI agent. */
    ai_agent: string | undefined;
    /** Unique identifier for the current mongosh session. */
    session_id: string;
    /** The anonymous identifier for this user session. */
    anonymousId: string;
    /** The OS platform (e.g. `"darwin"`, `"linux"`, `"win32"`). */
    platform: string;
    /** The CPU architecture (e.g. `"x64"`, `"arm64"`). */
    arch: string;
    /** Whether mongosh is running inside a container. */
    is_containerized: boolean;
    /** The OS type (e.g. `"Darwin"`, `"Linux"`). */
    os_type: string | undefined;
    /** The OS version string. */
    os_version: string | undefined;
    /** The OS architecture. */
    os_arch: string | undefined;
    /** The OS release identifier. */
    os_release: string | undefined;
    /** Linux-only: distribution ID from /etc/os-release (e.g. `"ubuntu"`). */
    os_linux_dist: string | undefined;
    /** Linux-only: version ID from /etc/os-release (e.g. `"22.04"`). */
    os_linux_release: string | undefined;
    /** macOS-only: product name from SystemVersion.plist (e.g. `"macOS"`). */
    os_darwin_product_name: string | undefined;
    /** macOS-only: product version from SystemVersion.plist (e.g. `"14.1.0"`). */
    os_darwin_product_version: string | undefined;
    /** macOS-only: product build version from SystemVersion.plist (e.g. `"23B74"`). */
    os_darwin_product_build_version: string | undefined;
    /** A stable machine identifier; `"unknown"` if unavailable. */
    device_id: string;
  };
}

/**
 * Emitted when mongosh establishes a new connection to a MongoDB server.
 *
 * Fired on bus event: `mongosh:connect`
 *
 * @category Session
 */
export interface NewConnectionEvent {
  name: 'New Connection';
  payload: {
    /** The version of mongosh that emitted the event. */
    mongosh_version: string;
    /** AI agent identifier if the session was initiated by an AI agent. */
    ai_agent: string | undefined;
    /** Unique identifier for the current mongosh session. */
    session_id: string;
    /** Whether the server is an Atlas deployment. */
    is_atlas: boolean;
    /** Whether the connection URI is an Atlas URL. */
    is_atlas_url: boolean | undefined;
    /** Whether the server is a local Atlas deployment. */
    is_local_atlas: boolean;
    /** Whether connecting to localhost. */
    is_localhost: boolean | undefined;
    /** Whether the URI is a DigitalOcean URL. */
    is_do_url: boolean | undefined;
    /** Whether the server is MongoDB Enterprise. */
    is_enterprise: boolean | undefined;
    /** Whether the server is a genuine MongoDB instance. */
    is_genuine: boolean;
    /** Whether the server is Atlas Data Federation. */
    is_data_federation: boolean | undefined;
    /** Whether the server is Atlas Stream Processing. */
    is_stream: boolean | undefined;
    /**
     * The resolved Atlas hostname when is_atlas is true, otherwise null.
     * Derived from the resolved_hostname field of the connect event.
     */
    atlas_hostname: string | null;
    /** The MongoDB server version string. */
    server_version: string;
    /** The OS on which the server is running. */
    server_os: string | undefined;
    /** The CPU architecture of the server. */
    server_arch: string | undefined;
    /** The server name when is_genuine is false. */
    non_genuine_server_name: string;
    /** The authentication mechanism used (e.g. `"DEFAULT"`, `"SCRAM-SHA-256"`). */
    auth_type: string | undefined;
    /** The MongoDB Versioned API version string. */
    api_version: string | undefined;
    /** Whether the MongoDB Versioned API strict mode is enabled. */
    api_strict: boolean | undefined;
    /** Whether the MongoDB Versioned API deprecation errors are enabled. */
    api_deprecation_errors: boolean | undefined;
    /** The CSFLE/QE shared library version. */
    dl_version: string | undefined;
    /** The Atlas version string. */
    atlas_version: string | undefined;
    /** The Node.js version used by mongosh. */
    node_version: string | undefined;
    /** Whether the connection URI uses the SRV format (`mongodb+srv://`). */
    is_srv: boolean | undefined;
    /** The topology type reported by the driver (e.g. `"Single"`, `"ReplicaSetWithPrimary"`). */
    topology_type: string | undefined;
    /** Whether Client-Side Field Level Encryption (CSFLE/QE) is configured. */
    is_csfle: boolean | undefined;
    /** Whether a CSFLE schema map or encrypted fields map is provided. */
    has_csfle_schema: boolean | undefined;
    /** Unique identifier for the Mongo connection instance. */
    connection_id: string | undefined;
  };
}

/**
 * Emitted at the end of each session when closing the REPL and before flushing telemetry.
 * Only emitted when is_interactive === true OR ai_agent !== undefined.
 *
 * @category Session
 */
export interface SessionEndedEvent {
  name: 'Session Ended';
  payload: {
    /** The version of mongosh that emitted the event. */
    mongosh_version: string;
    /** AI agent identifier if the session was initiated by an AI agent. */
    ai_agent: string | undefined;
    /** Unique identifier for the current mongosh session. */
    session_id: string;
    /** Whether mongosh was started in interactive (REPL) mode. */
    is_interactive: boolean;
    /** Map of command keys with counts from REPL evaluations. */
    commands_repl: Record<string, number> | undefined;
    /** Map of command keys with counts from ~/.mongoshrc.js. */
    commands_rc: Record<string, number> | undefined;
    /** Insertion-ordered list of command keys as they were invoked, capped at 100 entries. */
    sequence: string[];
    /** True if the sequence was longer than the max and was truncated. */
    sequence_truncated: boolean;
    /** Count of all errors thrown during the session. */
    error_count: number;
    /** Duration in milliseconds spent on REPL setup. */
    repl_instantiation_ms: number | undefined;
    /** Duration in milliseconds spent reading user config files. */
    user_config_loading_ms: number | undefined;
    /** Duration in milliseconds spent connecting to MongoDB. */
    driver_setup_ms: number | undefined;
    /** Duration in milliseconds spent on log file setup. */
    logging_ms: number | undefined;
    /** Duration in milliseconds spent loading snippets. */
    snippet_loading_ms: number | undefined;
    /** Duration in milliseconds spent on V8 snapshot restore. */
    snapshot_ms: number | undefined;
    /** Duration in milliseconds spent loading resource files (e.g. .mongoshrc.js). */
    resource_file_loading_ms: number | undefined;
    /** Duration in milliseconds spent on async rewriting of user input. */
    async_rewrite_ms: number | undefined;
    /** Duration in milliseconds spent evaluating expressions. */
    eval_ms: number | undefined;
    /** Duration in milliseconds spent evaluating script files. */
    eval_file_ms: number | undefined;
    /** Duration in milliseconds spent on telemetry setup. */
    telemetry_ms: number | undefined;
    /** Duration in milliseconds not attributed to any other category. */
    main_ms: number | undefined;
    /** True when ~/.mongoshrc.js is found and loaded. */
    mongoshrc_loaded: boolean;
    /** True when ~/.mongorc.js exists but ~/.mongoshrc.js does not. */
    mongorc_warning: boolean;
    /** Number of snippets installed via the snippet install command. */
    snippet_loaded_count: number;
    /** Whether the --shell flag was set. */
    shell_flag: boolean;
    /** Number of --eval scripts executed. */
    cli_eval_count: number;
    /** Number of --file scripts loaded. */
    cli_file_count: number;
    /** Number of top-level evaluations. */
    evaluation_count: number | undefined;
  };
}

/**
 * Union of all analytics events tracked by mongosh.
 */
export type TelemetryEvent =
  | IdentifyEvent
  | NewConnectionEvent
  | SessionEndedEvent;
