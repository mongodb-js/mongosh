# `@mongosh/shell-bson`

> Expose MongoDB Shell BSON classes based on the Node.js driver BSON package

## Usage

```js
import { constructShellBson, makePrintableBson } from '@mongosh/shell-bson';
import * as bson from 'bson';
import * as vm from 'vm';

// Optional: Get shell-compatible pretty-printing for BSON objects
// when used with Node.js's custom inspect() functionality
makePrintableBson(bson);

// Create Shell-like BSON helpers
const shellBson = constructShellBson({
  bsonLibrary: bson,
  printWarning: console.warn,
});

// Evaluate code against Shell-like BSON helpers
const document = vm.runInNewContext(
  '({ uuid: UUID(), dec128: NumberDecimal("12.34") })',
  { ...shellBson }
);
```
