# async-rewriter3

This package contains a Rust-based implementation of the `@mongosh/async-rewriter2`
JavaScript transpiler. It implements the same async-rewrite feature: making selected
JavaScript expressions implicitly `await`able based on a marker symbol.

## Approach

While the `async-rewriter2` package uses AST manipulation (via babel) and code
generation to produce the transformed output, this Rust implementation aims to
achieve its goal only through AST *parsing* and string manipulation based on
that AST.

The transpiler:

1. Parses the input source code using [`oxc`](https://oxc-project.github.io/).
2. Walks the AST and, for each node, generates a list of `Insertion` records:
   each insertion specifies an offset into the original source and a string
   to insert at that offset.
3. Sorts the insertions by offset (with stable ordering for insertions at the
   same offset).
4. Generates the output by concatenating slices of the original source and the
   inserted strings.
5. Runs a post-processing pass to relocate hoisted function declarations and
   to restructure `for-of` loops into a shape that produces friendlier error
   messages.

Compared to AST manipulation + code generation, this approach has the benefit
that the output retains most of the original source character-for-character,
which makes line/column numbers in error messages largely intact and avoids
introducing unrelated formatting changes.

## Feature parity

The implementation aims for full feature parity with `async-rewriter2`. See
the shared test suite in `@mongosh/async-rewriter-spec` for the contract.

The following features are implemented:

- IIFE wrapping with top-level scope extraction for `var`/`let`/`const` and
  class declarations.
- Function declarations hoisted to the program (or IIFE) scope, including
  block-scoped function declarations.
- Async-function wrapping of every non-async function in the input, with
  synchronous/asynchronous return-value tracking so callers can either get
  results synchronously or as a (marked) Promise.
- Implicit `await` of expressions that evaluate to "synthetic Promise" values
  (marked via `Symbol.for('@@mongosh.syntheticPromise')`).
- Async-iterator support for `for-of` loops over synthetic async iterables
  (marked via `Symbol.for('@@mongosh.syntheticAsyncIterable')`).
- Uncatchable exceptions (errors marked with
  `Symbol.for('@@mongosh.uncatchable')` bypass `catch` and `finally` blocks).
- Error-message demangling so that messages like `db.foo is not a function`
  remain readable despite the rewriting that wraps `db.foo` with synthetic-Promise
  detection.
- `Function.prototype.toString` patching (via the runtime support code) so that
  rewritten functions still report their original source text.
- Detection of "sync-only" contexts (class constructors and non-async generator
  functions) and throwing `[ASYNC-10012]` / `[ASYNC-10013]` errors when a
  synthetic Promise/async iterable would be implicitly awaited/iterated there.

## API

```js
import AsyncWriter from '@mongosh/async-rewriter3';
const writer = new AsyncWriter();
const transpiledCodeString = writer.processSync(inputCodeString);
const runtimeSupportCode = writer.runtimeSupportCode();
```

The runtime support code installs polyfills for built-in array/map/set methods
that take callbacks (so that callbacks inside `forEach`, `map`, etc. can do
implicit awaits) and patches `Function.prototype.toString` to return the
original source text.
