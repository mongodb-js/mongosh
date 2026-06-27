# mongosh Tracking Plan

> Auto-generated on 2026-06-26. Do not edit manually.
> Run `npm run generate-tracking-plan` to regenerate from source.

## Table of Contents

- [Common Properties](#common-properties)
- [Session](#session)
  - [Identify](#identify)
  - [New Connection](#new-connection)
  - [Session Complete](#session-complete)

## Common Properties

Properties automatically included in every track() event.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `mongosh_version` | `string` | Yes | The version of mongosh that emitted the event. |
| `ai_agent` | `string \| undefined` | No | AI agent identifier if the session was initiated by an AI agent. |
| `session_id` | `string` | Yes | Unique identifier for the current mongosh session. |


## Session

### Identify

Emitted once per session at startup to associate device and OS traits with the session.

_No additional properties._

### New Connection

Emitted when mongosh establishes a new connection to a MongoDB server.

Fired on bus event: `mongosh:connect`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `is_atlas` | `boolean` | Yes | Whether the server is an Atlas deployment. |
| `is_atlas_url` | `boolean \| undefined` | No | Whether the connection URI is an Atlas URL. |
| `is_local_atlas` | `boolean` | Yes | Whether the server is a local Atlas deployment. |
| `is_localhost` | `boolean \| undefined` | No | Whether connecting to localhost. |
| `is_do_url` | `boolean \| undefined` | No | Whether the URI is a DigitalOcean URL. |
| `is_enterprise` | `boolean \| undefined` | No | Whether the server is MongoDB Enterprise. |
| `is_genuine` | `boolean` | Yes | Whether the server is a genuine MongoDB instance. |
| `is_data_federation` | `boolean \| undefined` | No | Whether the server is Atlas Data Federation. |
| `is_stream` | `boolean \| undefined` | No | Whether the server is Atlas Stream Processing. |
| `atlas_hostname` | `string \| null` | Yes | The resolved Atlas hostname when is_atlas is true, otherwise null. Derived from the resolved_hostname field of the connect event. |
| `server_version` | `string` | Yes | The MongoDB server version string. |
| `server_os` | `string \| undefined` | No | The OS on which the server is running. |
| `server_arch` | `string \| undefined` | No | The CPU architecture of the server. |
| `non_genuine_server_name` | `string` | Yes | The server name when is_genuine is false. |
| `auth_type` | `string \| undefined` | No | The authentication mechanism used (e.g. `"DEFAULT"`, `"SCRAM-SHA-256"`). |
| `api_version` | `string \| undefined` | No | The MongoDB Versioned API version string. |
| `api_strict` | `boolean \| undefined` | No | Whether the MongoDB Versioned API strict mode is enabled. |
| `api_deprecation_errors` | `boolean \| undefined` | No | Whether the MongoDB Versioned API deprecation errors are enabled. |
| `dl_version` | `string \| undefined` | No | The CSFLE/QE shared library version. |
| `atlas_version` | `string \| undefined` | No | The Atlas version string. |
| `node_version` | `string \| undefined` | No | The Node.js version used by mongosh. |

### Session Complete

Emitted at the end of each session when closing the REPL and before flushing telemetry.
Only emitted when is_interactive === true OR ai_agent !== undefined.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `is_interactive` | `boolean` | Yes | Whether mongosh was started in interactive (REPL) mode. |
| `commands_repl` | `any` | Yes | Map of command keys with counts from REPL evaluations. |
| `commands_rc` | `any` | Yes | Map of command keys with counts from ~/.mongoshrc.js. |
| `sequence` | `{}` | Yes | Insertion-ordered list of command keys as they were invoked, capped at 100 entries. |
| `sequence_truncated` | `boolean` | Yes | True if the sequence was longer than the max and was truncated. |
| `error_count` | `number` | Yes | Count of all errors thrown during the session. |
| `repl_instantiation_ms` | `number \| undefined` | No | Duration in milliseconds spent on REPL setup. |
| `user_config_loading_ms` | `number \| undefined` | No | Duration in milliseconds spent reading user config files. |
| `driver_setup_ms` | `number \| undefined` | No | Duration in milliseconds spent connecting to MongoDB. |
| `logging_ms` | `number \| undefined` | No | Duration in milliseconds spent on log file setup. |
| `snippet_loading_ms` | `number \| undefined` | No | Duration in milliseconds spent loading snippets. |
| `snapshot_ms` | `number \| undefined` | No | Duration in milliseconds spent on V8 snapshot restore. |
| `resource_file_loading_ms` | `number \| undefined` | No | Duration in milliseconds spent loading resource files (e.g. .mongoshrc.js). |
| `async_rewrite_ms` | `number \| undefined` | No | Duration in milliseconds spent on async rewriting of user input. |
| `eval_ms` | `number \| undefined` | No | Duration in milliseconds spent evaluating expressions. |
| `eval_file_ms` | `number \| undefined` | No | Duration in milliseconds spent evaluating script files. |
| `telemetry_ms` | `number \| undefined` | No | Duration in milliseconds spent on telemetry setup. |
| `main_ms` | `number \| undefined` | No | Duration in milliseconds not attributed to any other category. |
| `mongoshrc_loaded` | `boolean` | Yes | True when ~/.mongoshrc.js is found and loaded. |
| `mongorc_warning` | `boolean` | Yes | True when ~/.mongorc.js exists but ~/.mongoshrc.js does not. |
| `snippet_loaded_count` | `number` | Yes | Number of snippets installed via the snippet install command. |
| `shell_flag` | `boolean` | Yes | Whether the --shell flag was set. |
| `cli_eval_count` | `number` | Yes | Number of --eval scripts executed. |
| `cli_file_count` | `number` | Yes | Number of --file scripts loaded. |
| `evaluation_count` | `number \| undefined` | No | Number of top-level evaluations. |

