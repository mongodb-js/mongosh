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

#### IframeRuntime

Uses an iframe window as sandbox for code execution. **NOTE:** the execution is not really sandboxed, the top window is accessible.

``` js
import { IframeRuntime } from 'mongosh-browser-repl';

const runtime = new IframeRuntime(serviceProvider);
```