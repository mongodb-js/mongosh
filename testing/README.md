# @mongosh/testing

Internal testing utilities for mongosh packages. This package is only used for testing purposes within the mongosh monorepo.

## Contents

- **integration-testing-hooks.ts** - Test server setup and helpers for integration tests
- **eventually.ts** - Retry helper for asynchronous tests
- **fake-kms.ts** - Mock KMS server for field-level encryption tests

## Usage

```typescript
import {
  startSharedTestServer,
  startTestServer,
  eventually,
  makeFakeHTTPServer,
} from '@mongosh/testing';
```
