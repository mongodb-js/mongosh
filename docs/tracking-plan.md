# mongosh Tracking Plan

> Auto-generated on 2026-06-30. Do not edit manually.
> Run `npm run generate-tracking-plan` to regenerate from source.

## Table of Contents

- [Common Properties](#common-properties)
- [API](#api)
  - [API Call](#api-call)
  - [Deprecated Method](#deprecated-method)
- [Connection](#connection)
  - [New Connection](#new-connection)
  - [Startup Time](#startup-time)
- [Errors](#errors)
  - [Error](#error)
- [Identity](#identity)
  - [Identify](#identify)
- [Shell](#shell)
  - [Use](#use)
  - [Show](#show)
  - [Script Loaded](#script-loaded)
  - [Script Loaded CLI](#script-loaded-cli)
  - [Script Evaluated](#script-evaluated)
  - [Mongoshrc Loaded](#mongoshrc-loaded)
  - [Mongorc Warning](#mongorc-warning)
- [Snippets](#snippets)
  - [Snippet Install](#snippet-install)

## Common Properties

Properties automatically included in every event.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `mongosh_version` | `string` | Yes | The version of mongosh that emitted the event. |
| `session_id` | `string` | Yes | Unique identifier for the current mongosh session. |


## API

### API Call

Emitted once per top-level user evaluation for each distinct async API method called.

Fired on bus event: `mongosh:evaluate-finished`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `class` | `string` | Yes | The shell API class name (e.g. `"Collection"`, `"Database"`). |
| `method` | `string` | Yes | The method name (e.g. `"find"`, `"insertOne"`). |
| `count` | `number` | Yes | The number of times this method was called during the current evaluation. |

### Deprecated Method

Emitted when a deprecated shell API method is called.

Fired on bus event: `mongosh:evaluate-finished`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `class` | `string` | Yes | The shell API class that contains the deprecated method. |
| `method` | `string` | Yes | The deprecated method name. |


## Connection

### New Connection

Emitted when mongosh establishes a new connection to a MongoDB server.

Fired on bus event: `mongosh:connect`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `is_atlas` | `boolean \| undefined` | No | Whether the server is an Atlas deployment. |
| `is_localhost` | `boolean \| undefined` | No | Whether the server is running on localhost. |
| `is_do_url` | `boolean \| undefined` | No | Whether the connection URL follows the DigitalOcean format. |
| `server_version` | `string \| undefined` | No | The MongoDB server version string. |
| `server_os` | `string \| undefined` | No | The OS on which the server is running. |
| `server_arch` | `string \| undefined` | No | The CPU architecture of the server. |
| `is_enterprise` | `boolean \| undefined` | No | Whether the server is an Enterprise edition. |
| `auth_type` | `string \| undefined` | No | The authentication mechanism used (e.g. `"DEFAULT"`, `"SCRAM-SHA-256"`). |
| `is_data_federation` | `boolean \| undefined` | No | Whether the server is Atlas Data Federation. |
| `is_stream` | `boolean \| undefined` | No | Whether the server is Atlas Stream Processing. |
| `dl_version` | `string \| undefined` | No | The MongoDB Shared Library (CSFLE) version. |
| `atlas_version` | `string \| undefined` | No | The Atlas version. |
| `is_genuine` | `boolean \| undefined` | No | Whether the server is a genuine MongoDB server. |
| `non_genuine_server_name` | `string \| undefined` | No | The server name when it is not a genuine MongoDB server. |
| `api_version` | `string \| undefined` | No | The MongoDB Versioned API version string. |
| `api_strict` | `boolean \| undefined` | No | Whether the MongoDB Versioned API strict mode is enabled. |
| `api_deprecation_errors` | `boolean \| undefined` | No | Whether the MongoDB Versioned API deprecation errors are enabled. |
| `node_version` | `string \| undefined` | No | The Node.js version used by mongosh. |
| `is_local_atlas` | `boolean \| undefined` | No | Whether the server is a local Atlas deployment. |
| `is_atlas_url` | `boolean \| undefined` | No | Whether the connection URL follows the Atlas URL format. |
| `atlas_hostname` | `string \| null` | Yes | The Atlas hostname; present only for Atlas connections, `null` otherwise. |

### Startup Time

Emitted once per session with startup timing breakdown.

Fired on bus event: `mongosh:start-session`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `is_interactive` | `boolean` | Yes | Whether mongosh was started in interactive (REPL) mode. |
| `js_context` | `"repl" \| "plain-vm"` | Yes | The JavaScript context used by the shell. |
| `repl_instantiation` | `number \| undefined` | No | Duration in milliseconds spent on REPL setup. |
| `user_config_loading` | `number \| undefined` | No | Duration in milliseconds spent reading user config files. |
| `driver_setup` | `number \| undefined` | No | Duration in milliseconds spent connecting to MongoDB. |
| `logging` | `number \| undefined` | No | Duration in milliseconds spent on log file setup. |
| `snippet_loading` | `number \| undefined` | No | Duration in milliseconds spent loading snippets. |
| `snapshot` | `number \| undefined` | No | Duration in milliseconds spent on V8 snapshot restore. |
| `resource_file_loading` | `number \| undefined` | No | Duration in milliseconds spent loading resource files (e.g. `.mongoshrc.js`). |
| `async_rewrite` | `number \| undefined` | No | Duration in milliseconds spent on async rewriting of user input. |
| `eval` | `number \| undefined` | No | Duration in milliseconds spent evaluating expressions. |
| `eval_file` | `number \| undefined` | No | Duration in milliseconds spent evaluating script files. |
| `telemetry` | `number \| undefined` | No | Duration in milliseconds spent on telemetry setup. |
| `main` | `number \| undefined` | No | Duration in milliseconds not attributed to any other category. |


## Errors

### Error

Emitted when a Mongosh-specific error is thrown.

Fired on bus event: `mongosh:error` (only for errors whose `name` includes `"Mongosh"`)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | The error class name (e.g. `"MongoshInvalidInputError"`). |
| `code` | `unknown` | Yes | The mongosh error code. |
| `scope` | `unknown` | Yes | The scope in which the error was raised. |
| `metadata` | `unknown` | Yes | Additional metadata attached to the error. |


## Identity

### Identify

Emitted once per session at startup to associate device and OS traits with the session.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `platform` | `string` | Yes | The OS platform (e.g. `"darwin"`, `"linux"`, `"win32"`). |
| `device_id` | `string` | Yes | A persistent, machine-specific identifier. |


## Shell

### Use

Emitted when the user runs the `use <db>` command.

Fired on bus event: `mongosh:use`

_No additional properties._

### Show

Emitted when the user runs a `show` command (e.g. `show dbs`, `show collections`).

Fired on bus event: `mongosh:show`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `method` | `string` | Yes | The `show` sub-command that was invoked (e.g. `"dbs"`, `"collections"`). |

### Script Loaded

Emitted when a script file is loaded via `load()` while the REPL is already running.

Fired on bus event: `mongosh:api-load-file` (after the REPL has started)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `nested` | `boolean` | Yes | Whether the script was loaded as a nested `load()` call from within another script. |

### Script Loaded CLI

Emitted when a script file is loaded before the REPL starts (e.g. via `--file`).

Fired on bus event: `mongosh:api-load-file` (before the REPL has started)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `nested` | `boolean` | Yes | Whether the script was loaded as a nested `load()` call from within another script. |
| `shell` | `boolean` | Yes | Whether mongosh was invoked with the `--shell` flag. |

### Script Evaluated

Emitted when a script is passed directly on the command line and evaluated.

Fired on bus event: `mongosh:eval-cli-script`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `shell` | `boolean` | Yes | Whether mongosh was invoked with the `--shell` flag. |

### Mongoshrc Loaded

Emitted when `.mongoshrc.js` is loaded at startup.

Fired on bus event: `mongosh:mongoshrc-load`

_No additional properties._

### Mongorc Warning

Emitted when a legacy `.mongorc.js` file is detected and a migration warning is shown.

Fired on bus event: `mongosh:mongoshrc-mongorc-warn`

_No additional properties._


## Snippets

### Snippet Install

Emitted when a snippet is installed via the `snippet install` command.

Fired on bus event: `mongosh-snippets:snippet-command` (only for `install` sub-commands)

_No additional properties._

