# browser-runtime-core

Core and support classes and types used by runtimes.

## Api

### `Runtime`

Encapsulates the details of evaluation logic exposing an implementation
agnostic interface.

All runtimes implement the following interface:

- `evaluate(code: string): Promise<EvaluationResult>`: Evaluates a string of code.

### `EvaluationResult`

An object holding the result of an evaluation. Has the following properties:

- `shellApiType?: string`: the shell api type if the entry value is a shell api object.
- `value: any`: the value that has to be rendered in output.
