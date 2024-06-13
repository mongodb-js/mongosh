# MongoDB Shell Security Testing Summary

This document lists specific instances of security-relevant testing that is being
performed for the MongoDB Shell. All parts of the MongoDB Shell source code
are subject to integration and unit testing on every change made to the project,
including the specific instances listed below.

# Security Tests

## Loading the MongoDB `crypt_shared` library securely

mongosh loads the `crypt_shared` MongoDB library at runtime. In order to do so securely,
we verify that the path resolution logic used for it adheres to expectations, and e.g.
the shared library will not be loaded if it comes with incorrect filesystem permissions.

<!-- Source File: `packages/cli-repl/src/crypt-library-paths.spec.ts` -->


## Authentication End-to-End Tests

While mongosh is a client-side application and therefore, in many cases not responsible
for correct authentication, we still consider any failure in our authentication tests
a potential warning sign for security-relevant impact.

<!-- Source File: `packages/e2e-tests/test/e2e-auth.spec.ts` -->


## OIDC Authentication End-to-End Tests

In addition to our regular tests for the different authentication mechanisms supported
by MongoDB, we give special consideration to our OpenID Connect database authentication
feature, as it involves client applications performing actions based on directions
received from the database server.

Additionally, since the shell supports connections to multiple different endpoints in the
same application, these tests ensure that OIDC authentication for distinct endpoints
happens in isolation.

<!-- Source File: `packages/e2e-tests/test/e2e-oidc.spec.ts` -->


## TLS End-to-End Tests

Our TLS tests verify that core security properties of TLS connections
are applied appropriately for mongosh, in particular certificate validation
and compliance with user-specified behavior that is specific to TLS connectivity.

<!-- Source File: `packages/e2e-tests/test/e2e-tls.spec.ts` -->


## Shell History Redaction Tests

The MongoDB Shell redacts items from the shell history file when it detects
potentially sensitive information in them. Our tests verify this behavior.

<!-- Source File: `packages/history/src/history.spec.ts` -->

