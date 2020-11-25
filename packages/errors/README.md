# `@mongosh/errors`

Package for [MongoDB Shell](mongosh)

## Usage

```
const { MongoshUnimplementedError } = require('@mongosh/errors');

function evaluate(input) {
  if (input === 'some input') {
    throw new MongoshUnimplementedError(`${input} is not implemented`);
  }
}

// throws: MongoshUnimplemetedError: some input is not implemented
evaluate('some input')
```
### API

#### MongoshBaseError
All errors inherit from the abstract `MongoshBaseError` which in turn inherits from `Error`.

All `MongoshBaseError`s have the following properties:
* `name`: _inherited from `Error`_. The name of the error, corresponding to the concrete class name.
* `message`: _inherited from `Error`_. Descriptive message of the error.
* `code`: _optional_. A unique identification code given when constructing the error.
* `scope`: _optional_. The scope is automatically extracted from a given `code`.
  The `scope` will be extracted from the `code` using the following pattern: `/^([a-zA-Z0-9]+)-/`.
  Example: `code='ASYNC-01005'` produces `scope='ASYNC'`.

#### MongoshWarning(msg, code?)
This error is used to give user a warning about the current execution.
__args:__
- __msg:__ type string. Describes the warning.
- __code:__ *optional* type string. Unique identification code of the warning.

#### MongoshUnimplementedError(msg, code?)
This error is used to API endpoints that are not yet implemented. 
__args:__
- __msg:__ type string. Describes what is not yet implemented.
- __code:__ *optional* type string. Unique identification code of the error.

#### MongoshRuntimeError(msg, code?)
Used for errors in evaluation, specific to MongoDB Shell. Should not be used for
JavaScript runtime errors.

__args:__
- __msg:__ type string. Describes what caused the error and a potential fix, if
  avaialable.
- __code:__ *optional* type string. Unique identification code of the error.

#### MongoshInternalError(msg, code?)
Used for rare cases when MongoDB Shell is not able to parse and evaluate the
input.
__args:__
- __msg:__ type string. Describes error in detail, so the user can better report
  it.
- __code:__ *optional* type string. Unique identification code of the error.

`e.message` will be appended with the following information:
```js
This is an error inside Mongosh. Please file a bug report. Please include a log file from this session.
```

#### MongoshInvalidInputError(msg, code?)
This error is used for invalid MongoDB input. This should not be used for
JavaScript syntax errors, but rather for those specific to MongoDB.
__args:__
- __msg:__ type string. Describes error in detail, providing current invalid
  input, and a fix, if available. 
- __code:__ *optional* type string. Unique identification code of the error.

## Installation
```shell
npm install -S @mongosh/errors
```

[mongosh]: https://github.com/mongodb-js/mongosh

