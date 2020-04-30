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

#### MongoshWarning(msg)
This error is used to give user a warning about the current execution.
__args:__
- __msg:__ type string. Describes the warning.

#### MongoshUnimplementedError(msg)
This error is used to API endpoints that are not yet implemented. 
__args:__
- __msg:__ type string. Describes what is not yet implemented.

#### MongoshRuntimeError(msg)
Used for errors in evaluation, specific to MongoDB Shell. Should not be used for
JavaScript runtime errors.

__args:__
- __msg:__ type string. Describes what caused the error and a potential fix, if
  avaialable.

#### MongoshInternalError(msg)
Used for rare cases when MongoDB Shell is not able to parse and evaluate the
input.
__args:__
- __msg:__ type string. Describes error in detail, so the user can better report
  it.

`e.message` will be appended with the following information:
```js
This is an error inside Mongosh. Please file a bug report. Please include a log file from this session.
```

#### MongoshInvalidInputError(msg)
This error is used for invalid MongoDB input. This should not be used for
JavaScript syntax errors, but rather for those specific to MongoDB.
__args:__
- __msg:__ type string. Describes error in detail, providing current invalid
  input, and a fix, if available. 

## Installation
```shell
npm install -S @mongosh/errors
```

[mongosh]: https://github.com/mongodb-js/mongosh

