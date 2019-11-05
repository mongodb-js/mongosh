# mongosh-transport

This is the repository for all transport layers in the MongoDB shell that
are used by the various service providers.

## Transports Available in a Node Environment

### Node Transport

The Node transport provides a wrapper around the Node driver and the ability
to run various commands against a cluster via the driver.

#### Usage

```js
const NodeTransport = require('mongodbsh-transport/dist/node');
const transport = await NodeTransport.fromURI('mongodb://localhost:27017');

const result = await transport.runCommand({ ismaster: 2 });
```

### Stitch Server Transport

Allows limited command execution against a Stitch remote connection service.

```js
const { StitchServerTransport } = require('mongodbsh-transport/dist/node');
```

## Transports Available in a Browser Environment

### StitchBrowserTransport

Allows limited command execution against a Stitch remote connection service.

```js
const StitchBrowserTransport = require('mongodbsh-transport');
```
