export const skipOIDCTestsDueToPlatformOrServerVersion = () =>
  process.platform !== 'linux' ||
  !process.env.MONGOSH_SERVER_TEST_VERSION ||
  !process.env.MONGOSH_SERVER_TEST_VERSION.includes('-enterprise');

export const baseOidcServerConfig = {
  clientId: 'testServer',
  requestScopes: ['mongodbGroups'],
  authorizationClaim: 'groups',
  audience: 'resource-server-audience-value',
  authNamePrefix: 'dev',
} as const;

export const commonOidcServerArgs = [
  '--setParameter',
  'authenticationMechanisms=SCRAM-SHA-256,MONGODB-OIDC',
  // enableTestCommands allows using http:// issuers such as http://localhost
  '--setParameter',
  'enableTestCommands=true',
];
