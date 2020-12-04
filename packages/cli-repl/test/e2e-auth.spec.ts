import { expect } from 'chai';
import {
  MongoClient, MongoClientOptions
} from 'mongodb';
import { eventually } from './helpers';
import { TestShell } from './test-shell';
import {
  startTestServer
} from '../../../testing/integration-testing-hooks';

function createAssertUserExists(db, dbName): Function {
  return async(opts = {}, username = 'anna'): Promise<void> => {
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

function createAssertRoleExists(db, dbName): Function {
  return async(roles, privileges, rolename = 'anna'): Promise<void> => {
    const result = await db.command({ rolesInfo: 1, showPrivileges: true, showBuiltinRoles: false });
    expect(result.roles.length).to.equal(1);
    const role = result.roles[0];
    expect(role.role).to.equal(rolename);
    expect(role.db).to.equal(dbName);
    expect(role.isBuiltin).to.be.false;
    expect(role.roles.length).to.equal(roles.length);
    expect(role.privileges.length).to.equal(privileges.length);

    roles.forEach(r => {
      expect(role.roles).to.deep.contain(r);
    });
    privileges.forEach(r => {
      expect(role.privileges).to.deep.contain(r);
    });
  };
}


function createAssertUserAuth(db, connectionString, dbName): Function {
  return async(pwd = 'pwd', username = 'anna', keepClient = false): Promise<any> => {
    try {
      const c = await MongoClient.connect(
        connectionString,
        {
          useNewUrlParser: true,
          auth: { user: username, password: pwd, authSource: dbName },
          connectTimeoutMS: 1000
        } as unknown as MongoClientOptions // TODO: Node 4.0 update, Missing 'password' in Auth see NODE-2921
      );
      if (keepClient) {
        return c;
      }
      await c.close();
    } catch (e) {
      expect.fail(`Could not authenticate user to initialize test: ${e.message}`);
    }
  };
}

describe('Auth e2e', function() {
  const testServer = startTestServer('shared');
  let assertUserExists;
  let assertUserAuth;
  let assertRoleExists;

  let db;
  let client;
  let shell: TestShell;
  let dbName;
  let examplePrivilege1;
  let examplePrivilege2;

  describe('with regular URI', () => {
    beforeEach(async() => {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;
      shell = TestShell.start({ args: [connectionString] });

      client = await (MongoClient as any).connect(
        connectionString,
        { useNewUrlParser: true }
      );

      db = client.db(dbName);
      assertUserExists = createAssertUserExists(db, dbName);
      assertUserAuth = createAssertUserAuth(db, connectionString, dbName);
      assertRoleExists = createAssertRoleExists(db, dbName);
      examplePrivilege1 = { resource: { db: dbName, collection: 'coll' }, actions: ['killCursors'] };
      examplePrivilege2 = { resource: { db: dbName, collection: 'coll2' }, actions: ['find'] };

      await shell.waitForPrompt();
      shell.assertNoErrors();
    });

    afterEach(async() => {
      await db.dropDatabase();
      await db.command({ dropAllUsersFromDatabase: 1 });

      client.close();
      await TestShell.killall();
    });

    describe('user management', () => {
      describe('createUser', async() => {
        afterEach(async() => {
          await assertUserAuth();
        });
        it('all arguments', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.createUser({ user: "anna", pwd: "pwd", customData: { extra: 1 }, roles: ["dbAdmin"], mechanisms: ["SCRAM-SHA-256"], passwordDigestor: "server"})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            customData: { extra: 1 },
            roles: [{ role: 'dbAdmin', db: dbName }],
            mechanisms: ['SCRAM-SHA-256']
          });
          shell.assertNoErrors();
        });
        it('default arguments', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.createUser({ user: "anna", pwd: "pwd", roles: []})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1', 'SCRAM-SHA-256']
          });
          shell.assertNoErrors();
        });
        it('digestPassword', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.createUser({ user: "anna", pwd: "pwd", roles: [], mechanisms: ["SCRAM-SHA-1"], passwordDigestor: "client"})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1']
          });
          shell.assertNoErrors();
        });
      });
      describe('updateUser', async() => {
        beforeEach(async() => {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: []
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          await assertUserExists({
            roles: []
          });
          await assertUserAuth();
        });
        afterEach(async() => {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('all arguments', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.updateUser("anna", { pwd: "pwd2", customData: { extra: 1 }, roles: ["dbAdmin"], mechanisms: ["SCRAM-SHA-256"], passwordDigestor: "server"})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            customData: { extra: 1 },
            roles: [{ role: 'dbAdmin', db: dbName }],
            mechanisms: ['SCRAM-SHA-256']
          });
          await assertUserAuth('pwd2');
          shell.assertNoErrors();
        });
        it('just customData', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.updateUser("anna", { customData: { extra: 1 } })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            roles: [],
            customData: { extra: 1 },
            mechanisms: ['SCRAM-SHA-1', 'SCRAM-SHA-256' ]
          });
          shell.assertNoErrors();
        });
        it('digestPassword', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.updateUser("anna", { pwd: "pwd3", passwordDigestor: "client", mechanisms: ["SCRAM-SHA-1"]})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1']
          });
          await assertUserAuth('pwd3');
          shell.assertNoErrors();
        });
        it('changeUserPassword', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.changeUserPassword("anna", "pwd4")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            roles: [],
            mechanisms: ['SCRAM-SHA-1', 'SCRAM-SHA-256']
          });
          await assertUserAuth('pwd4');
        });
      });
      describe('delete users', async() => {
        beforeEach(async() => {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: []
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          const r2 = await db.command({
            createUser: 'anna2',
            pwd: 'pwd2',
            roles: []
          });
          expect(r2.ok).to.equal(1, 'Unable to create user to initialize test');
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(2);
        });
        afterEach(async() => {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('dropUser', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.dropUser("anna2")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists();
          shell.assertNoErrors();
        });
        it('dropAllUsers', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.dropAllUsers()'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ n: 2, ok: 1 }');
          });
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(0);
          shell.assertNoErrors();
        });
      });
      describe('add/remove roles', async() => {
        beforeEach(async() => {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: [ { role: 'dbAdmin', db: dbName }]
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          await assertUserExists({
            roles: [ { role: 'dbAdmin', db: dbName }]
          });
          await assertUserAuth();
        });
        afterEach(async() => {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('grantRolesToUser', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.grantRolesToUser("anna", [ "userAdmin", "dbOwner" ])'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(1);
          const user = result.users[0];
          expect(user.roles.map(k => k.role)).to.have.members([
            'dbOwner', 'dbAdmin', 'userAdmin'
          ]);
          shell.assertNoErrors();
        });
        it('revokeRolesFrom', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.revokeRolesFromUser("anna", [ "dbAdmin" ])'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertUserExists({
            roles: [],
          });
          shell.assertNoErrors();
        });
      });
      describe('get user info', () => {
        beforeEach(async() => {
          const r = await db.command({
            createUser: 'anna',
            pwd: 'pwd',
            roles: []
          });
          expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
          const r2 = await db.command({
            createUser: 'anna2',
            pwd: 'pwd2',
            roles: []
          });
          expect(r2.ok).to.equal(1, 'Unable to create user to initialize test');
          const result = await db.command({ usersInfo: 1 });
          expect(result.users.length).to.equal(2);
        });
        afterEach(async() => {
          await db.command({ dropAllUsersFromDatabase: 1 });
        });
        it('getUser when user exists', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getUser("anna2")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('user: \'anna2\'');
          });
          shell.assertNoErrors();
        });
        it('getUser when user does not exist', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getUser("anna3")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('null');
          });
          shell.assertNoErrors();
        });
        it('getUsers without filter', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getUsers()'
          );
          await eventually(async() => {
            shell.assertContainsOutput('users: [');
            shell.assertContainsOutput('user: \'anna\'');
            shell.assertContainsOutput('user: \'anna2\'');
          });
          shell.assertNoErrors();
        });
        it('getUsers with filter', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getUsers({ filter: { user: "anna" } })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('user: \'anna\'');
          });
          shell.assertNoErrors();
        });
      });
    });
    describe('role management', () => {
      describe('createRole', async() => {
        it('all arguments', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            `db.createRole({ role: "anna", privileges: ${JSON.stringify([examplePrivilege1])}, roles: ["dbAdmin"], authenticationRestrictions: [ { serverAddress: {}} ] })`
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
        it('default arguments', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.createRole({ role: "anna", roles: [], privileges: []})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists([], []);
          shell.assertNoErrors();
        });
      });
      describe('updateRole', async() => {
        beforeEach(async() => {
          const r = await db.command({
            createRole: 'anna',
            privileges: [],
            roles: []
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          await assertRoleExists([], []);
        });
        afterEach(async() => {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('all arguments', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            `db.updateRole("anna", { privileges: ${JSON.stringify([examplePrivilege1])}, roles: ["dbAdmin"] })`
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
        it('just privileges', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            `db.updateRole("anna", { privileges: ${JSON.stringify([examplePrivilege1])} })`
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists(
            [],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
      });
      describe('delete roles', async() => {
        beforeEach(async() => {
          const r = await db.command({
            createRole: 'anna',
            roles: [],
            privileges: []
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          const r2 = await db.command({
            createRole: 'anna2',
            roles: [],
            privileges: []
          });
          expect(r2.ok).to.equal(1, 'Unable to create role to initialize test');
          const result = await db.command({ rolesInfo: 1 });
          expect(result.roles.length).to.equal(2);
        });
        afterEach(async() => {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('dropRole', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.dropRole("anna2")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists([], []);
          shell.assertNoErrors();
        });
        it('dropAllRoles', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.dropAllRoles()'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ n: 2, ok: 1 }');
          });
          const result = await db.command({ rolesInfo: 1 });
          expect(result.roles.length).to.equal(0);
          shell.assertNoErrors();
        });
      });
      describe('grant/remove roles/privileges', async() => {
        beforeEach(async() => {
          const r = await db.command({
            createRole: 'anna',
            roles: [ { role: 'dbAdmin', db: dbName }],
            privileges: [examplePrivilege1]
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [examplePrivilege1]
          );
        });
        afterEach(async() => {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('grantRolesToRole', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.grantRolesToRole("anna", [ "dbOwner" ])'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists([
            { role: 'dbAdmin', db: dbName },
            { role: 'dbOwner', db: dbName }
          ], [examplePrivilege1]);
          shell.assertNoErrors();
        });
        it('revokeRolesFrom', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.revokeRolesFromRole("anna", [ "dbAdmin" ])'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists(
            [],
            [examplePrivilege1]
          );
          shell.assertNoErrors();
        });
        it('grantPrivilegesToRole', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            `db.grantPrivilegesToRole("anna", ${JSON.stringify([examplePrivilege2])})`
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            [ examplePrivilege1, examplePrivilege2 ]
          );
          shell.assertNoErrors();
        });
        it('revokePrivilegesFrom', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            `db.revokePrivilegesFromRole("anna", ${JSON.stringify([examplePrivilege1])})`
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await assertRoleExists(
            [{ role: 'dbAdmin', db: dbName }],
            []
          );
          shell.assertNoErrors();
        });
      });
      describe('get role info', () => {
        beforeEach(async() => {
          const r = await db.command({
            createRole: 'anna',
            roles: [ 'dbAdmin' ],
            privileges: []
          });
          expect(r.ok).to.equal(1, 'Unable to create role to initialize test');
          const r2 = await db.command({
            createRole: 'anna2',
            roles: [],
            privileges: []
          });
          expect(r2.ok).to.equal(1, 'Unable to create role to initialize test');
          const result = await db.command({ rolesInfo: 1 });
          expect(result.roles.length).to.equal(2);
        });
        afterEach(async() => {
          await db.command({ dropAllRolesFromDatabase: 1 });
        });
        it('getRole when custom role exists', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRole("anna2")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('role: \'anna2\'');
          });
          shell.assertNoErrors();
        });
        it('getRole when custom role exists with showPrivileges', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRole("anna2", { showPrivileges: true })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('role: \'anna2\'');
            shell.assertContainsOutput('privileges: []');
          });
          shell.assertNoErrors();
        });
        it('getRole when role does not exist', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRole("anna3")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('null');
          });
          shell.assertNoErrors();
        });
        it('getRole for built-in role with showBuiltinRoles=true', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRole("dbAdmin", { showBuiltinRoles: true })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('role: \'dbAdmin\'');
          });
          shell.assertNoErrors();
        });
        it('getRoles', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRoles()'
          );
          await eventually(async() => {
            shell.assertContainsOutput('roles: [');
            shell.assertContainsOutput('role: \'anna\'');
            shell.assertContainsOutput('role: \'anna2\'');
          });
          shell.assertNoErrors();
        });
        it('getRoles with rolesInfo field', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRoles( {rolesInfo: { db: "other", role: "anna" } })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('roles: []');
          });
          shell.assertNoErrors();
        });
        it('getRoles with rolesInfo field', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            `db.getRoles( {rolesInfo: { db: "${dbName}", role: "anna" } })`
          );
          await eventually(async() => {
            shell.assertContainsOutput('roles: [');
            shell.assertContainsOutput('role: \'anna\'');
          });
          shell.assertNoErrors();
        });
        it('getRoles with showPrivileges', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRoles({ showPrivileges: true })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('privileges: []');
          });
          shell.assertNoErrors();
        });
        it('getRoles with showBuiltinRoles', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.getRoles({ showBuiltinRoles: true })'
          );
          await eventually(async() => {
            shell.assertContainsOutput('role: \'read\'');
          });
          shell.assertNoErrors();
        });
      });
    });
    describe('authentication', () => {
      beforeEach(async() => {
        const r = await db.command({
          createUser: 'anna',
          pwd: 'pwd',
          roles: []
        });
        expect(r.ok).to.equal(1, 'Unable to create user to initialize test');
        await assertUserExists({
          roles: []
        });
      });
      afterEach(async() => {
        db.command({ dropAllUsersFromDatabase: 1 });
      });
      describe('auth', async() => {
        it('logs in with simple user/pwd', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.auth("anna", "pwd")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('user: \'anna\'');
          });
          shell.assertNoErrors();
        });
        it('logs in with user doc', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.auth({user: "anna", pwd: "pwd"})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('user: \'anna\'');
          });
          shell.assertNoErrors();
        });
        it('digestPassword errors with message', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.auth({user: "anna", pwd: "pwd", digestPassword: true})'
          );
          await eventually(async() => {
            shell.assertContainsError('MongoshUnimplementedError: [COMMON-90002] digestPassword is not supported for authentication');
          });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('authenticatedUsers: []');
          });
        });
        it('throws if pwd is wrong', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.auth("anna", "pwd2")'
          );
          await eventually(async() => {
            shell.assertContainsError('Authentication failed');
          }, { timeout: 40000 });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('authenticatedUsers: []');
          });
        });
        it('throws if mech is not recognized', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.auth({ user: "anna", pwd: "pwd2", mechanism: "not a mechanism"})'
          );
          await eventually(async() => {
            shell.assertContainsError('MongoError: authentication mechanism NOT A MECHANISM not supported');
          }, { timeout: 40000 });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('authenticatedUsers: []');
          });
        });
      });
      describe('logout', async() => {
        it('logs out after authenticating', async() => {
          await shell.writeInputLine(`use ${dbName}`);
          await shell.writeInputLine(
            'db.auth("anna", "pwd")'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('user: \'anna\'');
          });
          await shell.writeInputLine(
            'db.logout()'
          );
          await eventually(async() => {
            shell.assertContainsOutput('{ ok: 1 }');
          });
          await shell.writeInputLine(
            'db.runCommand({connectionStatus: 1})'
          );
          await eventually(async() => {
            shell.assertContainsOutput('authenticatedUsers: []');
          });
          shell.assertNoErrors();
        });
      });
    });
  });
  describe('with options in URI', () => {
    beforeEach(async() => {
      const connectionString = await testServer.connectionString();
      dbName = `test-${Date.now()}`;

      client = await (MongoClient as any).connect(
        connectionString,
        { useNewUrlParser: true }
      );

      db = client.db(dbName);
      expect((await db.command({
        createUser: 'anna', pwd: 'pwd', roles: []
      })).ok).to.equal(1);
      expect((await db.command({
        createUser: 'anna2', pwd: 'pwd2', roles: []
      })).ok).to.equal(1);

      assertUserExists = createAssertUserExists(db, dbName);
      assertUserAuth = createAssertUserAuth(db, connectionString, dbName);
      await assertUserAuth('pwd2', 'anna2');
    });
    it('can auth when there is login in URI', async() => {
      const connectionString = await testServer.connectionString();
      const split = connectionString.split('//');
      const authConnectionString = `${split[0]}//anna2:pwd2@${split[1]}/${dbName}`;
      shell = TestShell.start({ args: [authConnectionString] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
      await shell.writeInputLine(`use ${dbName}`);
      await shell.writeInputLine(
        'db.runCommand({connectionStatus: 1})'
      );
      await eventually(async() => {
        shell.assertContainsOutput('user: \'anna2\'');
      });
      await shell.writeInputLine(
        'db.auth({user: "anna", pwd: "pwd"})'
      );
      await eventually(async() => {
        shell.assertContainsOutput('{ ok: 1 }');
      });
      await shell.writeInputLine(
        'db.runCommand({connectionStatus: 1})'
      );
      await eventually(async() => {
        shell.assertContainsOutput('user: \'anna\'');
      });
      shell.assertNoErrors();
    });
    it('can auth when there is -u and -p', async() => {
      const connectionString = await testServer.connectionString();
      shell = TestShell.start({ args: [
        connectionString,
        ' -u "anna2"',
        ' -p "pwd2"',
        ` --authenticationDatabase "${dbName}"`
      ] });
      await shell.waitForPrompt();
      shell.assertNoErrors();
      await shell.writeInputLine('db');
      await shell.writeInputLine(`use ${dbName}`);
      await shell.writeInputLine('db.getUsers()');
      await shell.writeInputLine(
        'db.runCommand({connectionStatus: 1})'
      );
      await eventually(async() => {
        shell.assertContainsOutput('user: \'anna2\'');
      });
      await shell.writeInputLine(
        'db.auth({user: "anna", pwd: "pwd"})'
      );
      await eventually(async() => {
        shell.assertContainsOutput('{ ok: 1 }');
      });
      await shell.writeInputLine(
        'db.runCommand({connectionStatus: 1})'
      );
      await eventually(async() => {
        shell.assertContainsOutput('user: \'anna\'');
      });
      shell.assertNoErrors();
    });
    afterEach(async() => {
      await db.dropDatabase();
      await db.command({ dropAllUsersFromDatabase: 1 });

      client.close();
      await TestShell.killall();
    });
  });
});
