# Usage

```js
var Logger = require('@mongosh/logger')
var path = require('path')
var fs = require('fs')
var os = require('os')

var saveFilePath = path.join(os.homedir(), '.mongosh_log')
var log = new Logger(saveFilePath)

var infoObject = {
  shellCommand: 'db.sales.find({ storeLocation: "Berlin" })'
}

var errorObject = {
  shellCommand: 'db.sales.find({ storeLocation: "Berlin" })'
  error: new TypeError()
}

log.info(infoObject)
log.error(errorObject)
```

Logger uses [pino](https://github.com/pinojs/pino) under the hood for logging.

Within mongosh architecture, `Logger` gets initialised along with the `Mapper`
and requires passing in logger parameters to ShellMapper:

![Using Logger with browser, Compass and CLI interfaces requires passing in
logger parameters to ShellMapper](./logger-usage.png)

```js
var CliServiceProvider = require('mongosh-service-provider-server').CliServiceProvider
var ShellApi = require('mongosh-shell-api')
var Mapper = require('mongosh-mapper')

var loggerPath = path.join(os.homedir(), '.mongosh_log')

CliServiceProvider.connect(driverUri, driverOptions)
  .then(function (serviceProvider) {
    var mapper = new Mapper(serviceProvider, loggerPath)
    var shellApi = new ShellApi(this.mapper)
  })
```

## API
### `new Logger([destination])`
Create a new Logger instance. Provide destination path to file if you want to save
information locally. Otherwise data will only be sent to
[Segment](https://segment.com/docs/connections/sources/catalog/libraries/website/javascript/)

 By default, all logger events would be converted to
[Log4j](https://en.wikipedia.org/wiki/Log4j) browser `console` methods, i.e.
`console.error`, `console.warn`, `console.info`, `console.debug`,
`console.trace`, and uses `console.error` for fatal entries.  


### `new Logger([browserObject])`
Creates a new Logger with browser usage specifications.

```js
var Logger= require('@mongosh/logger')
var log = new Logger({
  browser: {
    asObject: true,
    write: {
      info: function (infoLog) {
        // work with info object from the logger
      },
      error: function (errorLog) {
        // work with error object from the logger
      }
    }
  }
})

```

### `log.info(String|Object)`
Writes an info level log with the provided `String` or `Object`.

### `log.error(String|Object)`
Writes an error level log with the provided `String` or `Object`.

### `log.trace(String|Object)`
Writes a trace level log with the provided `String` or `Object`.

### `log.debug(String|Object)`
Writes a debug level log with the provided `String` or `Object`.

### `log.fatal(String|Object)`
Writes a fatal level log with the provided `String` or `Object`.
`Fatal` level log is intended to be used prior to a process exiting. This will
sync flush the destination.

### `log.warn(String|Object)`
Writes a warn level log with the provided `String` or `Object`.

