# Browser Repl

React Browser component for Mongo Shell

## Usage

``` js
import { Shell } from 'mongosh-browser-repl';

export () => {
  return <Shell runtime={runtime} />;
}
```

### Available Runtimes

#### ElectronRuntime

Uses Node.js `vm` module as sandbox for code execution.

``` js
import { ElectronRuntime } from 'mongosh-browser-repl';

const runtime = new ElectronRuntime(serviceProvider);
```

##### Example: usage in Compass

``` js
import { Shell, ElectronRuntime } from 'mongosh-browser-repl';

const runtime = new ElectronRuntime(
  CompassServiceProvider.fromDataService(dataService)
);

function MyShell(props) {
  return <Shell runtime={runtime} />;
}
```

#### IframeRuntime

Uses an iframe window as sandbox for code execution. **NOTE:** the execution is not really sandboxed, the top window is accessible.

``` js
import { IframeRuntime } from 'mongosh-browser-repl';

const runtime = new IframeRuntime(serviceProvider);
```

## API

### `<Shell />`

Shell is a React component with the following properties:

- `runtime: Runtime`: The runtime used to evaluate code.
- `onOutputChanged?: (output: readonly ShellOutputEntry[]) => void`: A function called each time the output changes with an array of ShellOutputEntryes.
- `onOutputChanged?: (output: readonly ShellOutputEntry[]) => void`: A function called each time the history change with an array of history entries ordered from the most recent to the oldest entry.
- `onHistoryChanged?: (history: readonly string[]) => void`
- `redactInfo?: boolean`: If set the shell will omit or redact entries containing sensitive info from the history. Default to `false`.
- `maxOutputLength?: number`: The maxiumum number of lines to keep in the output. Default to `1000`.
- `maxHistoryLength?: number`: The maxiumum number of lines to keep in the history. Default to `1000`.
- `initialOutput?: readonly ShellOutputEntry[]`: An array of entries to be displayed in the output area. Can be used to restore the output between sessions, or to setup a greeting message. *Note: new entries will not be appended to the array.
- `initialHistory?: readonly string[]`: An array of history entries to prepopulate the history.
  Can be used to restore the history between sessions. Entries must be ordered from the most recent to the oldest. Note: new entries will not be appended to the array.

### `ShellOutputEntry`

An object representing an entry in the shell output, having the follwing properties:

- `type: 'input' | 'output' | 'error'`: the type of the entry
- `shellApiType?: string`: the shell api type if the entry value is a shell api object.
- `value: any`: the value that has to be rendered in the output.

### `Runtime`

Encapsulates the details of evaluation logic exposing an inplementation neutral
interface.

Any runtime implements the following interface:

- `evaluate(code: string): Promise<EvaluationResult>`: Evaluates a string of code.

### `EvaluationResult`

An object holding the result of an evaluation. Has the following properties:

- `shellApiType?: string`: the shell api type if the entry value is a shell api object.
- `value: any`: the value that has to be rendered in the output.

