# Browser Repl

React Browser component for Mongo Shell

## Usage

```js
import { Shell } from 'mongosh-browser-repl';

export () => {
  return <Shell runtime={runtime} />;
}
```

### Built-in Runtimes

#### IframeRuntime

Uses an iframe window as sandbox for code execution. **NOTE:** the execution is not really sandboxed, the top window is accessible.

```js
import { IframeRuntime } from 'mongosh-browser-repl';

const runtime = new IframeRuntime(serviceProvider);
```

## API

### `<Shell />`

Shell is a React component with the following properties:

- `runtime: Runtime`: The runtime used to evaluate code.
- `onOutputChanged?: (output: ShellOutputEntry[]) => void`: A function called each time the output changes with an array of `ShellOutputEntries`.
- `onHistoryChanged?: (history: string[]) => void`: A function called each time the history changes with an array of history entries ordered from the most recent to the oldest entry.
- `onEditorChanged?: (editor: EditorRef | null) => void`: A function called each time the editor ref changes. Can be used to call editor methods.
- `onOperationStarted?: () => void`: A function called when an operation has begun.
- `onOperationEnd?: () => void`: A function called when an operation has completed (both error and success).
- `redactInfo?: boolean`: If set, the shell will omit or redact entries containing sensitive info from history. Defaults to `false`.
- `maxOutputLength?: number`: The maxiumum number of lines to keep in the output. Defaults to `1000`.
- `maxHistoryLength?: number`: The maxiumum number of lines to keep in the history. Defaults to `1000`.
- `initialEvaluate?: string|string[]`: A set of input strings to evaluate right after shell is mounted.
- `initialText?: string`: The initial text for the input field.
- `output?: ShellOutputEntry[]`: An array of entries to be displayed in the output area. Can be used to restore the output between sessions, or to setup a greeting message. **Note**: new entries will not be appended to the array.
- `history?: readonly string[]`: An array of history entries to prepopulate the history.
  Can be used to restore the history between sessions. Entries must be ordered from the most recent to the oldest. Note: new entries will not be appended to the array.
- `isOperationInProgress?: boolean`: Can be used to restore the value between sessions.

### `ShellOutputEntry`

An object representing an entry in the shell output, with the following properties:

- `format: 'input' | 'output' | 'error'`: the type of the entry
- `type?: string`: the shell api type if the entry value is a shell api object.
- `value: any`: the value that has to be rendered in output.
