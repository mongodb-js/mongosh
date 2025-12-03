import { expect } from 'chai';
import type { Db, Document, MongoClientOptions } from 'mongodb';
import { MongoClient } from 'mongodb';
import { eventually } from '../../../testing/eventually';
import type { TestShell } from './test-shell';
import {
  skipIfApiStrict,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';

type AssertUserExists = (opts?: Document, username?: string) => Promise<void>;
function createAssertUserExists(db: Db, dbName: string): AssertUserExists {
  return async (opts = {}, username = 'anna'): Promise<void> => {
    const result = await db.command({ usersInfo: 1 });
    expect(result.users.length).to.equal(1);
    const user = result.users[0];
    expect(user.db).to.equal(dbName);
    expect(user.user).to.equal(username);
    Object.keys(opts).forEach((k) => {
      expect(user[k]).to.deep.equal(opts[k]);
    });
  };
}

type AssertRoleExists = (
  roles: Document[],
  privileges: Document[],
  rolename?: string
) => Promise<void>;
function createAssertRoleExists(db: Db, dbName: string): AssertRoleExists {
  return async (roles, privileges, rolename = 'anna'): Promise<void> => {
    const result = await db.command({
      rolesInfo: 1,
      showPrivileges: true,
      showBuiltinRoles: false,
    });
    expect(result.roles.length).to.equal(1);
    const role = result.roles[0];
    expect(role.role).to.equal(rolename);
    expect(role.db).to.equal(dbName);
    expect(role.isBuiltin).to.be.false;
    expect(role.roles.length).to.equal(roles.length);
    expect(role.privileges.length).to.equal(privileges.length);

    roles.forEach((r) => {
      expect(role.roles).to.deep.contain(r);
    });
    privileges.forEach((r) => {
      expect(role.privileges).to.deep.contain(r);
    });
  };
}

type AssertUserAuth = (
  pwd?: string,
  username?: string,
  keepClient?: boolean
) => Promise<void | MongoClient>;
function createAssertUserAuth(
  db: Db,
  connectionString: string,
  dbName: string
): AssertUserAuth {
  return async (
    pwd = 'pwd',
    username = 'anna',
    keepClient = false
  ): Promise<any> => {
    try {
      const c = await MongoClient.connect(connectionString, {
        auth: { username: username, password: pwd },
        authSource: dbName,
        connectTimeoutMS: 1000,
      } as MongoClientOptions);
      if (keepClient) {
        return c;
      }
      await c.close();
    } catch (e: any) {
      expect.fail(
        `Could not authenticate user to initialize test: ${e.message}`
      );
    }
  };
}

/**
 * @securityTest Authentication End-to-End Tests
 *
 * While mongosh is a client-side application and therefore, in many cases not responsible
 * for correct authentication, we still consider any failure in our authentication tests
 * a potential warning sign for security-relevant impact.
 */
describe('Auth e2e', function () {
  skipIfApiStrict(); // connectionStatus is unversioned.

  const testServer = startSharedTestServer();
  let assertUserExists: AssertUserExists;
  let assertUserAuth: AssertUserAuth;
  let assertRoleExists: AssertRoleExists;

  let db: Db;
  let client: MongoClient;
  let shell: TestShell;
  let dbName: string;
  let examplePrivilege1: Document;
  let examplePrivilege2: Document;

  describe('with regular URI', function () {
    beforeEach(async function () {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;
      shell = this.startTestShell({ args: [connectionString] });

      client = await MongoClient.connect(connectionString, {});

      db = client.db(dbName);
      assertUserExists = createAssertUserExists(db, dbName);
      assertUserAuth = createAssertUserAuth(db, connectionString, dbName);
      assertRoleExists = createAssertRoleExists(db, dbName);
      examplePrivilege1 = {
        resource: { db: dbName, collection: 'coll' },
        actions: ['killCursors'],
      };
      examplePrivilege2 = {
        resource: { db: dbName, collection: 'coll2' },
        actions: ['find'],
      };

      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    afterEach(async function () {
      await db.dropDatabase();
      await db.command({ dropAllUsersFromDatabase: 1 });

      await client.close();
    });

    describe('user management', function () {
      describe('createUser', function () {
        it('all arguments', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.createUser({ user: "anna", pwd: "pwd", customData: { extra: 1 }, roles: ["dbAdmin"], mechanisms: ["SCRAM-SHA-256"], passwordDigestor: "server"})'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            customData: { extra: 1 },
            roles: [{ role: 'dbAdmin', db: dbName }],
            mechanisms: ['SCRAM-SHA-256'],
          });
          shell.assertNoErrors();
          await assertUserAuth();
        });
        it('default arguments', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.createUser({ user: "anna", pwd: "pwd", roles: []})'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1', 'SCRAM-SHA-256'],
          });
          shell.assertNoErrors();
          await assertUserAuth();
        });
        it('digestPassword', async function () {
          if (
            process.env.MONGOSH_TEST_E2E_FORCE_FIPS ||
            process.env.DISTRO_ID === 'rhel93-fips'
          ) {
            return this.skip(); // No SCRAM-SHA-1 in FIPS mode
          }
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.createUser({ user: "anna", pwd: "pwd", roles: [], mechanisms: ["SCRAM-SHA-1"], passwordDigestor: "client"})'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1'],
          });
          shell.assertNoErrors();
          await assertUserAuth();
        });
      });
      describe('updateUser', function () {
        beforeEach(async function () {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: [],
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          await assertUserExists({
            roles: [],
          });
          await assertUserAuth();
        });
        afterEach(async function () {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('all arguments', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.updateUser("anna", { pwd: "pwd2", customData: { extra: 1 }, roles: ["dbAdmin"], mechanisms: ["SCRAM-SHA-256"], passwordDigestor: "server"})'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            customData: { extra: 1 },
            roles: [{ role: 'dbAdmin', db: dbName }],
            mechanisms: ['SCRAM-SHA-256'],
          });
          await assertUserAuth('pwd2');
          shell.assertNoErrors();
        });
        it('just customData', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.updateUser("anna", { customData: { extra: 1 } })'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            roles: [],
            customData: { extra: 1 },
            mechanisms: ['SCRAM-SHA-1', 'SCRAM-SHA-256'],
          });
          shell.assertNoErrors();
        });
        it('digestPassword', async function () {
          if (
            process.env.MONGOSH_TEST_E2E_FORCE_FIPS ||
            process.env.DISTRO_ID === 'rhel93-fips'
          ) {
            return this.skip(); // No SCRAM-SHA-1 in FIPS mode
          }
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.updateUser("anna", { pwd: "pwd3", passwordDigestor: "client", mechanisms: ["SCRAM-SHA-1"]})'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1'],
          });
          await assertUserAuth('pwd3');
          shell.assertNoErrors();
        });
        it('changeUserPassword', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine('db.changeUserPassword("anna", "pwd4")')
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1', 'SCRAM-SHA-256'],
          });
          await assertUserAuth('pwd4');
        });
      });
      describe('delete users', function () {
        beforeEach(async function () {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: [],
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          const r2 = await db.command({
            createUser: 'anna2',
            pwd: 'pwd2',
            roles: [],
          });
          expect(r2.ok).to.equal(1, 'Unable to create user to initialize test');
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(2);
        });
        afterEach(async function () {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('dropUser', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.dropUser("anna2")')).to.include(
            '{ ok: 1 }'
          );
          await assertUserExists();
          shell.assertNoErrors();
        });
        it('dropAllUsers', async function () {
          await shell.executeLine(`use ${dbName}`);
          shell.writeInputLine('db.dropAllUsers()');
          await eventually(() => {
            try {
              shell.assertContainsOutput('{ n: 2, ok: 1 }');
            } catch {
              // The 5.0+ server responds with a Long.
              shell.assertContainsOutput("{ n: Long('2'), ok: 1 }");
            }
          });
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(0);
          shell.assertNoErrors();
        });
      });
      describe('add/remove roles', function () {
        beforeEach(async function () {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: [{ role: 'dbAdmin', db: dbName }],
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          await assertUserExists({
            roles: [{ role: 'dbAdmin', db: dbName }],
          });
          await assertUserAuth();
        });
        afterEach(async function () {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('grantRolesToUser', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.grantRolesToUser("anna", [ "userAdmin", "dbOwner" ])'
            )
          ).to.include('{ ok: 1 }');
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(1);
          const user = result.users[0];
          expect(user.roles.map((k: any) => k.role)).to.have.members([
            'dbOwner',
            'dbAdmin',
            'userAdmin',
          ]);
          shell.assertNoErrors();
        });
        it('revokeRolesFrom', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.revokeRolesFromUser("anna", [ "dbAdmin" ])'
            )
          ).to.include('{ ok: 1 }');
          await assertUserExists({
            roles: [],
          });
          shell.assertNoErrors();
        });
      });
      describe('get user info', function () {
        beforeEach(async function () {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: [],
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          const r2 = await db.command({
            createUser: 'anna2',
            pwd: 'pwd2',
            roles: [],
          });
          expect(r2.ok).to.equal(1, 'Unable to create user to initialize test');
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(2);
        });
        afterEach(async function () {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('getUser when user exists', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.getUser("anna2")')).to.include(
            "user: 'anna2'"
          );
          shell.assertNoErrors();
        });
        it('getUser when user does not exist', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.getUser("anna3")')).to.include(
            'null'
          );
          shell.assertNoErrors();
        });
        it('getUsers without filter', async function () {
          await shell.executeLine(`use ${dbName}`);
          const output = await shell.executeLine('db.getUsers()');
          expect(output).to.include('users: [');
          expect(output).to.include("user: 'anna'");
          expect(output).to.include("user: 'anna2'");
          shell.assertNoErrors();
        });
        it('getUsers with filter', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine('db.getUsers({ filter: { user: "anna" } })')
          ).to.include("user: 'anna'");
          shell.assertNoErrors();
        });
      });
    });
    describe('role management', function () {
      describe('createRole', function () {
        it('all arguments', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              `db.createRole({ role: "anna", privileges: ${JSON.stringify([
                examplePrivilege1,
              ])}, roles: ["dbAdmin"], authenticationRestrictions: [ { serverAddress: [] } ] })`
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
        it('default arguments', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.createRole({ role: "anna", roles: [], privileges: []})'
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists([], []);
          shell.assertNoErrors();
        });
      });
      describe('updateRole', function () {
        beforeEach(async function () {
          const r = await db.command({
            createRole: 'anna',
            privileges: [],
            roles: [],
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          await assertRoleExists([], []);
        });
        afterEach(async function () {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('all arguments', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              `db.updateRole("anna", { privileges: ${JSON.stringify([
                examplePrivilege1,
              ])}, roles: ["dbAdmin"] })`
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
        it('just privileges', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              `db.updateRole("anna", { privileges: ${JSON.stringify([
                examplePrivilege1,
              ])} })`
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists([], [examplePrivilege1]);
          shell.assertNoErrors();
        });
      });
      describe('delete roles', function () {
        beforeEach(async function () {
          const r = await db.command({
            createRole: 'anna',
            roles: [],
            privileges: [],
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          const r2 = await db.command({
            createRole: 'anna2',
            roles: [],
            privileges: [],
          });
          expect(r2.ok).to.equal(1, 'Unable to create role to initialize test');
          const result = await db.command({ rolesInfo: 1 });
          expect(result.roles.length).to.equal(2);
        });
        afterEach(async function () {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('dropRole', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.dropRole("anna2")')).to.include(
            '{ ok: 1 }'
          );
          await assertRoleExists([], []);
          shell.assertNoErrors();
        });
        it('dropAllRoles', async function () {
          await shell.executeLine(`use ${dbName}`);
          shell.writeInputLine('db.dropAllRoles()');
          await eventually(() => {
            try {
              shell.assertContainsOutput('{ n: 2, ok: 1 }');
            } catch {
              // The 5.0+ server responds with a Long.
              shell.assertContainsOutput("{ n: Long('2'), ok: 1 }");
            }
          });
          const result = await db.command({ rolesInfo: 1 });
          expect(result.roles.length).to.equal(0);
          shell.assertNoErrors();
        });
      });
      describe('grant/remove roles/privileges', function () {
        beforeEach(async function () {
          const r = await db.command({
            createRole: 'anna',
            roles: [{ role: 'dbAdmin', db: dbName }],
            privileges: [examplePrivilege1],
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1]
          );
        });
        afterEach(async function () {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('grantRolesToRole', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.grantRolesToRole("anna", [ "dbOwner" ])'
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists(
            [
              { role: 'dbAdmin', db: dbName },
              { role: 'dbOwner', db: dbName },
            ],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
        it('revokeRolesFrom', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.revokeRolesFromRole("anna", [ "dbAdmin" ])'
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists([], [examplePrivilege1]);
          shell.assertNoErrors();
        });
        it('grantPrivilegesToRole', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              `db.grantPrivilegesToRole("anna", ${JSON.stringify([
                examplePrivilege2,
              ])})`
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1, examplePrivilege2]
          );
          shell.assertNoErrors();
        });
        it('revokePrivilegesFrom', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              `db.revokePrivilegesFromRole("anna", ${JSON.stringify([
                examplePrivilege1,
              ])})`
            )
          ).to.include('{ ok: 1 }');
          await assertRoleExists([{ role: 'dbAdmin', db: dbName }], []);
          shell.assertNoErrors();
        });
      });
      describe('get role info', function () {
        beforeEach(async function () {
          const r = await db.command({
            createRole: 'anna',
            roles: ['dbAdmin'],
            privileges: [],
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          const r2 = await db.command({
            createRole: 'anna2',
            roles: [],
            privileges: [],
          });
          expect(r2.ok).to.equal(1, 'Unable to create role to initialize test');
          const result = await db.command({ rolesInfo: 1 });
          expect(result.roles.length).to.equal(2);
        });
        afterEach(async function () {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('getRole when custom role exists', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.getRole("anna2")')).to.include(
            "role: 'anna2'"
          );
          shell.assertNoErrors();
        });
        it('getRole when custom role exists with showPrivileges', async function () {
          await shell.executeLine(`use ${dbName}`);
          const output = await shell.executeLine(
            'db.getRole("anna2", { showPrivileges: true })'
          );
          expect(output).to.include("role: 'anna2'");
          expect(output).to.include('privileges: []');
          shell.assertNoErrors();
        });
        it('getRole when role does not exist', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.getRole("anna3")')).to.include(
            'null'
          );
          shell.assertNoErrors();
        });
        it('getRole for built-in role with showBuiltinRoles=true', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.getRole("dbAdmin", { showBuiltinRoles: true })'
            )
          ).to.include("role: 'dbAdmin'");
          shell.assertNoErrors();
        });
        it('getRoles', async function () {
          await shell.executeLine(`use ${dbName}`);
          const output = await shell.executeLine('db.getRoles()');
          expect(output).to.include('roles: [');
          expect(output).to.include("role: 'anna'");
          expect(output).to.include("role: 'anna2'");
          shell.assertNoErrors();
        });
        it('getRoles with rolesInfo field for other db', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.getRoles( {rolesInfo: { db: "other", role: "anna" } })'
            )
          ).to.include('roles: []');
          shell.assertNoErrors();
        });
        it('getRoles with rolesInfo field for the current db', async function () {
          await shell.executeLine(`use ${dbName}`);
          const output = await shell.executeLine(
            `db.getRoles( {rolesInfo: { db: "${dbName}", role: "anna" } })`
          );
          expect(output).to.include('roles: [');
          expect(output).to.include("role: 'anna'");
          shell.assertNoErrors();
        });
        it('getRoles with showPrivileges', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine('db.getRoles({ showPrivileges: true })')
          ).to.include('privileges: []');
          shell.assertNoErrors();
        });
        it('getRoles with showBuiltinRoles', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine('db.getRoles({ showBuiltinRoles: true })')
          ).to.include("role: 'read'");
          shell.assertNoErrors();
        });
      });
    });
    describe('authentication', function () {
      beforeEach(async function () {
        const r = await db.command({
          createUser: 'anna',
          pwd: 'pwd',
          roles: [],
        });
        expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
        await assertUserExists({
          roles: [],
        });
      });
      afterEach(async function () {
        await db.command({ dropAllUsersFromDatabase: 1 });
      });
      describe('auth', function () {
        it('logs in with simple user/pwd', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.auth("anna", "pwd")')).to.include(
            '{ ok: 1 }'
          );
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include("user: 'anna'");
          shell.assertNoErrors();
        });
        it('logs in with user doc', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine('db.auth({user: "anna", pwd: "pwd"})')
          ).to.include('{ ok: 1 }');
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include("user: 'anna'");
          shell.assertNoErrors();
        });
        it('digestPassword errors with message', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(
            await shell.executeLine(
              'db.auth({user: "anna", pwd: "pwd", digestPassword: true})'
            )
          ).to.include(
            'MongoshUnimplementedError: [COMMON-90002] digestPassword is not supported for authentication'
          );
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include('authenticatedUsers: []');
        });
        it('throws if pwd is wrong', async function () {
          await shell.executeLine(`use ${dbName}`);
          shell.writeInputLine('db.auth("anna", "pwd2")');
          await eventually(
            () => {
              shell.assertContainsError('Authentication failed');
            },
            { timeout: 40000 }
          );
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include('authenticatedUsers: []');
        });
        it('throws if mech is not recognized', async function () {
          await shell.executeLine(`use ${dbName}`);
          shell.writeInputLine(
            'db.auth({ user: "anna", pwd: "pwd2", mechanism: "not a mechanism"})'
          );
          await eventually(
            () => {
              expect(shell.output).to.match(
                /MongoParseError: authMechanism one of .+, got not a mechanism/
              );
            },
            { timeout: 40000 }
          );
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include('authenticatedUsers: []');
        });
      });
      describe('logout', function () {
        let unsubscribeAllowWarning: (() => void) | undefined;
        beforeEach(function () {
          // https://jira.mongodb.org/browse/SERVER-56266
          // https://jira.mongodb.org/browse/MONGOSH-2695
          unsubscribeAllowWarning = testServer.allowWarning?.(5626600);
        });
        afterEach(function () {
          unsubscribeAllowWarning?.();
        });
        it('logs out after authenticating', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.auth("anna", "pwd")')).to.include(
            '{ ok: 1 }'
          );
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include("user: 'anna'");
          expect(await shell.executeLine('db.logout()')).to.include(
            '{ ok: 1 }'
          );
          expect(
            await shell.executeLine('db.runCommand({connectionStatus: 1})')
          ).to.include('authenticatedUsers: []');
          shell.assertNoErrors();
        });
      });
      describe('resetting current cursor', function () {
        beforeEach(async function () {
          await db
            .collection('test')
            .insertMany([...Array(200).keys()].map((i) => ({ i })));
        });
        it('is reset after auth, db reassign and logout', async function () {
          await shell.executeLine(`use ${dbName}`);
          expect(await shell.executeLine('db.test.find()')).to.include('i: 10');
          expect(await shell.executeLine('it')).to.include('i: 30');

          expect(await shell.executeLine('db.auth("anna", "pwd")')).to.include(
            'ok: 1'
          );
          expect(await shell.executeLine('it')).to.include('no cursor');
          expect(await shell.executeLine('db.test.find()')).to.include('i: 10');
          expect(await shell.executeLine('it')).to.include('i: 30');

          expect(
            await shell.executeLine(`db = db.getSiblingDB("${dbName}")`)
          ).to.include(`${dbName}\n`);
          expect(await shell.executeLine('it')).to.include('no cursor');
          expect(await shell.executeLine('db.test.find()')).to.include('i: 10');
          expect(await shell.executeLine('it')).to.include('i: 30');

          expect(await shell.executeLine('db.logout()')).to.include('ok: 1');
          expect(await shell.executeLine('it')).to.include('no cursor');
          expect(await shell.executeLine('db.test.find()')).to.include('i: 10');
          expect(await shell.executeLine('it')).to.include('i: 30');

          shell.assertNoErrors();
        });
      });
    });
  });
  describe('with options in URI on on the command line', function () {
    beforeEach(async function () {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;

      client = await MongoClient.connect(connectionString, {});

      db = client.db(dbName);
      expect(
        (
          await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: [],
          })
        ).ok
      ).to.equal(1);
      expect(
        (
          await db.command({
            createUser: 'anna2',
            pwd: 'pwd2',
            roles: [],
          })
        ).ok
      ).to.equal(1);
      expect(
        (
          await db.command({
            createUser: 'sha1user',
            pwd: 'sha1pwd',
            roles: [],
            mechanisms: ['SCRAM-SHA-1'],
          })
        ).ok
      ).to.equal(1);
      expect(
        (
          await db.command({
            createUser: 'sha256user',
            pwd: 'sha256pwd',
            roles: [],
            mechanisms: ['SCRAM-SHA-256'],
          })
        ).ok
      ).to.equal(1);

      assertUserExists = createAssertUserExists(db, dbName);
      assertUserAuth = createAssertUserAuth(db, connectionString, dbName);
      await assertUserAuth('pwd2', 'anna2');
    });
    it('can auth when there is login in URI', async function () {
      const authConnectionString = await testServer.connectionString(
        {},
        {
          username: 'anna2',
          password: 'pwd2',
          pathname: `/${dbName}`,
        }
      );
      shell = this.startTestShell({ args: [authConnectionString] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
      await shell.executeLine(`use ${dbName}`);
      expect(
        await shell.executeLine('db.runCommand({connectionStatus: 1})')
      ).to.include("user: 'anna2'");
      expect(
        await shell.executeLine('db.auth({user: "anna", pwd: "pwd"})')
      ).to.include('{ ok: 1 }');
      expect(
        await shell.executeLine('db.runCommand({connectionStatus: 1})')
      ).to.include("user: 'anna'");
      shell.assertNoErrors();
    });
    it('connection-resetting operations don’t undo auth', async function () {
      const authConnectionString = await testServer.connectionString(
        {},
        {
          username: 'anna2',
          password: 'pwd2',
          pathname: `/${dbName}`,
        }
      );
      shell = this.startTestShell({ args: [authConnectionString] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
      await shell.executeLine(`use ${dbName}`);
      expect(
        await shell.executeLine(
          'db.runCommand({connectionStatus:1}).authInfo.authenticatedUsers'
        )
      ).to.match(/user: 'anna2'/);
      expect(
        await shell.executeLine('db.auth({user: "anna", pwd: "pwd"})')
      ).to.match(/ok: 1/);
      expect(
        await shell.executeLine(
          'db.runCommand({connectionStatus:1}).authInfo.authenticatedUsers'
        )
      ).to.match(/user: 'anna'/);
      await shell.executeLine('db.getMongo().setReadConcern("majority")'); // No output
      expect(
        await shell.executeLine(
          'db.runCommand({connectionStatus:1}).authInfo.authenticatedUsers'
        )
      ).to.match(/user: 'anna'/);
      shell.assertNoErrors();
    });
    it('can auth when there is -u and -p', async function () {
      const connectionString = await testServer.connectionString();
      shell = this.startTestShell({
        args: [
          connectionString,
          '-u',
          'anna2',
          '-p',
          'pwd2',
          '--authenticationDatabase',
          dbName,
        ],
      });
      await shell.waitForPrompt();
      shell.assertNoErrors();
      await shell.executeLine('db');
      await shell.executeLine(`use ${dbName}`);
      expect(
        await shell.executeLine('db.runCommand({connectionStatus: 1})')
      ).to.include("user: 'anna2'");
      expect(
        await shell.executeLine('db.auth({user: "anna", pwd: "pwd"})')
      ).to.include('{ ok: 1 }');
      expect(
        await shell.executeLine('db.runCommand({connectionStatus: 1})')
      ).to.include("user: 'anna'");
      shell.assertNoErrors();
    });
    context('with specific auth mechanisms', function () {
      it('can auth with SCRAM-SHA-1', async function () {
        if (
          process.env.MONGOSH_TEST_E2E_FORCE_FIPS ||
          process.env.DISTRO_ID === 'rhel93-fips'
        ) {
          return this.skip(); // No SCRAM-SHA-1 in FIPS mode
        }
        const connectionString = await testServer.connectionString();
        shell = this.startTestShell({
          args: [
            connectionString,
            '-u',
            'sha1user',
            '-p',
            'sha1pwd',
            '--authenticationDatabase',
            dbName,
            '--authenticationMechanism',
            'SCRAM-SHA-1',
          ],
        });
        await shell.waitForPrompt();
        expect(
          await shell.executeLine('db.runCommand({connectionStatus: 1})')
        ).to.include("user: 'sha1user'");
        shell.assertNoErrors();
      });
      it('provides a helpful error message for SCRAM-SHA-1 in FIPS mode', async function () {
        {
          // This test is not particularly meaningful if we're using the system OpenSSL installation
          // and it is not properly configured for FIPS to begin with. This is the case on e.g.
          // Ubuntu 22.04 in evergreen CI.
          const preTestShell = this.startTestShell({
            args: [
              '--quiet',
              '--nodb',
              '--tlsFIPSMode',
              '--eval',
              'tls.createSecureContext()',
            ],
          });
          if (
            (await preTestShell.waitForAnyExit()) === 1 &&
            preTestShell.output.match(
              /digital envelope routines::unsupported|SSL routines::library has no ciphers/
            )
          ) {
            return this.skip();
          }
        }

        const connectionString = await testServer.connectionString();
        shell = this.startTestShell({
          args: [
            connectionString,
            '--tlsFIPSMode',
            '-u',
            'sha1user',
            '-p',
            'sha1pwd',
            '--authenticationDatabase',
            dbName,
            '--authenticationMechanism',
            'SCRAM-SHA-1',
          ],
        });
        await shell.waitForAnyExit();
        try {
          shell.assertContainsOutput(
            'Auth mechanism SCRAM-SHA-1 is not supported in FIPS mode'
          );
        } catch {
          shell.assertContainsOutput('Could not enable FIPS mode.');
        }
      });
      it('can auth with SCRAM-SHA-256', async function () {
        const connectionString = await testServer.connectionString();
        shell = this.startTestShell({
          args: [
            connectionString,
            '-u',
            'sha256user',
            '-p',
            'sha256pwd',
            '--authenticationDatabase',
            dbName,
            '--authenticationMechanism',
            'SCRAM-SHA-256',
          ],
        });
        await shell.waitForPrompt();
        expect(
          await shell.executeLine('db.runCommand({connectionStatus: 1})')
        ).to.include("user: 'sha256user'");
        shell.assertNoErrors();
      });
      it('cannot auth when authenticationMechanism mismatches (sha256 -> sha1)', async function () {
        const connectionString = await testServer.connectionString();
        shell = this.startTestShell({
          args: [
            connectionString,
            '-u',
            'sha256user',
            '-p',
            'sha256pwd',
            '--authenticationDatabase',
            dbName,
            '--authenticationMechanism',
            'SCRAM-SHA-1',
          ],
        });
        await eventually(() => {
          expect(shell.output).to.match(
            /MongoServerError: Authentication failed|Unable to use SCRAM-SHA-1/
          );
        });
      });
      it('cannot auth when authenticationMechanism mismatches (sha1 -> sha256)', async function () {
        const connectionString = await testServer.connectionString();
        shell = this.startTestShell({
          args: [
            connectionString,
            '-u',
            'sha1user',
            '-p',
            'sha1pwd',
            '--authenticationDatabase',
            dbName,
            '--authenticationMechanism',
            'SCRAM-SHA-256',
          ],
        });
        await eventually(() => {
          expect(shell.output).to.match(
            /MongoServerError: Authentication failed|Unable to use SCRAM-SHA-256/
          );
        });
      });
      it('does not fail with kerberos not found for GSSAPI', async function () {
        const connectionString = await testServer.connectionString();
        shell = this.startTestShell({
          args: [
            connectionString,
            '-u',
            'krbuser',
            '-p',
            'krbpwd',
            '--authenticationDatabase',
            '$external',
            '--authenticationMechanism',
            'GSSAPI',
          ],
        });
        await shell.waitForAnyExit();
        // Failing to auth with kerberos fails with different error messages on each OS.
        // Sometimes in CI, it also fails because the server received kerberos
        // credentials, most likely because of a successful login by another
        // CI project on the same host.
        const messages = [
          'Unspecified GSS failure',
          'The context has expired: Success',
          'The token supplied to the function is invalid',
          'No authority could be contacted for authentication',
          'Error from KDC',
          'No credentials cache file found',
          'No Kerberos credentials available',
          'The logon attempt failed',
          'Received authentication for mechanism GSSAPI which is not enabled',
          'Received authentication for mechanism GSSAPI which is unknown or not enabled',
          'Miscellaneous failure (see text): Unable to find realm of host localhost',
          'Miscellaneous failure (see text): no credential for',
          'Miscellaneous failure (see text): Matching credential',
          "Unsupported mechanism 'GSSAPI' on authentication database '$external'",
          'The specified target is unknown or unreachable',
          'Server not found in Kerberos database',
        ];
        expect(messages.some((msg) => shell.output.includes(msg))).to.equal(
          true,
          `${shell.output} must include a valid kerberos failure message`
        );
        shell.assertNotContainsOutput('Optional module `kerberos` not found');
      });
    });
    afterEach(async function () {
      await db.dropDatabase();
      await db.command({ dropAllUsersFromDatabase: 1 });

      await client.close();
    });
  });
});
