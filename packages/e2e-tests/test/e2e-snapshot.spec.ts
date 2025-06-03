import {
  skipIfApiStrict,
  startSharedTestServer,
} from '../../../testing/integration-testing-hooks';
import { expect } from 'chai';

const setDifference = <T>(a: T[], b: T[]) => a.filter((e) => !b.includes(e));
const expectIsSubset = <T>(a: T[], b: T[]) =>
  expect(setDifference(a, b)).to.have.lengthOf(0);
const commonPrefix = (a: string, b: string): string =>
  a.startsWith(b)
    ? b
    : b.startsWith(a)
    ? a
    : b && commonPrefix(a, b.slice(0, -1));

describe('e2e snapshot support', function () {
  skipIfApiStrict();

  const testServer = startSharedTestServer();

  context('modules included in snapshots', function () {
    it('includes the right modules at the right point in time', async function () {
      if (!process.env.MONGOSH_TEST_EXECUTABLE_PATH) return this.skip();

      const connectionString = await testServer.connectionString();
      const helperScript = `
      const S = process.__mongosh_webpack_stats;
      const L = (list) => list.map(S.lookupNaturalModuleName);
      `;
      const commonArgs = ['--quiet', '--json=relaxed', '--eval', helperScript];
      const argLists = [
        [...commonArgs, '--nodb', '--eval', 'L(S.enumerateAllModules())'],
        [...commonArgs, '--nodb', '--eval', 'L(S.enumerateSnapshotModules())'],
        [...commonArgs, '--nodb', '--eval', 'L(S.enumerateLoadedModules())'],
        [
          ...commonArgs,
          connectionString,
          '--eval',
          'L(S.enumerateLoadedModules())',
        ],
        [
          ...commonArgs,
          connectionString,
          '--jsContext=repl',
          '--eval',
          'L(S.enumerateLoadedModules())',
        ],
      ];
      const [
        all,
        atSnapshotTime,
        atNodbEvalTime,
        atDbEvalTime,
        atReplEvalTime,
      ] = (
        await Promise.all(
          argLists.map((args) =>
            this.startTestShell({ args }).waitForCleanOutput()
          )
        )
      ).map((output) =>
        (JSON.parse(output) as string[])
          .sort()
          .map((pkg) => pkg?.replace(/\\/g, '/'))
          .filter(
            (name) =>
              name &&
              !name.endsWith('.json') &&
              !name.includes('/lazy-webpack-modules/')
          )
      );

      // Ensure that: atSnapshotTime ⊆ atNodbEvalTime ⊆ atDbEvalTime ⊆ atReplEvalTime ⊆ all
      expectIsSubset(atSnapshotTime, atNodbEvalTime);
      expectIsSubset(atNodbEvalTime, atDbEvalTime);
      expectIsSubset(atDbEvalTime, atReplEvalTime);
      expectIsSubset(atReplEvalTime, all);

      const prefix = all.reduce(commonPrefix);
      const stripPrefix = (s: string) =>
        s.startsWith(prefix) ? s.replace(prefix, '') : s;

      const categorized = [
        ...atSnapshotTime.map(stripPrefix).map((m) => [m, 'snapshot'] as const),
        ...setDifference(atNodbEvalTime, atSnapshotTime)
          .map(stripPrefix)
          .map((m) => [m, 'nodb-eval'] as const),
        ...setDifference(atDbEvalTime, atNodbEvalTime)
          .map(stripPrefix)
          .map((m) => [m, 'db-eval'] as const),
        ...setDifference(atReplEvalTime, atDbEvalTime)
          .map(stripPrefix)
          .map((m) => [m, 'repl-eval'] as const),
        ...setDifference(all, atReplEvalTime)
          .map(stripPrefix)
          .map((m) => [m, 'not-loaded'] as const),
      ];

      // This is very helpful for inspecting snapshotted contents manually:
      // console.table(categorized.map(([m, c]) => [m.replace(prefix, ''), c]));
      const verifyAllInCategoryMatch = (
        category: (typeof categorized)[number][1],
        re: RegExp,
        negative = false
      ) => {
        for (const [module, cat] of categorized) {
          if (cat === category) {
            if (negative) {
              expect(module).not.to.match(
                re,
                `Found unexpected '${module}' in category '${cat}'`
              );
            } else {
              expect(module).to.match(
                re,
                `Found unexpected '${module}' in category '${cat}'`
              );
            }
          }
        }
      };
      const verifyAllThatMatchAreInCategory = (
        category: (typeof categorized)[number][1],
        re: RegExp
      ) => {
        for (const [module, cat] of categorized) {
          if (re.test(module)) {
            expect(cat).to.equal(
              category,
              `Expected '${module}' to be in category '${category}', actual category is '${cat}'`
            );
          }
        }
      };

      // The core test: Verify that in the categories beyond 'not loaded at all'
      // and 'part of the snapshot', only a very specific set of modules is present,
      // and that some modules are only in specific categories.
      verifyAllInCategoryMatch('repl-eval', /^node_modules\/pretty-repl\//);
      verifyAllInCategoryMatch(
        'db-eval',
        /^node_modules\/(kerberos|os-dns-native|resolve-mongodb-srv)\//
      );
      verifyAllInCategoryMatch(
        'nodb-eval',
        /^node_modules\/(kerberos|native-machine-id|mongodb-client-encryption|glibc-version|@mongodb-js\/devtools-proxy-support|@mongodb-js\/socksv5|agent-base|(win|macos)-export-certificate-and-key|@tootallnate\/quickjs-emscripten)\//
      );
      if (process.arch !== 's390x') {
        // quickjs is in the list above but should be exlucded anywhere but on s390x
        verifyAllInCategoryMatch('nodb-eval', /quickjs-emscripten/, true);
      }
      verifyAllThatMatchAreInCategory(
        'not-loaded',
        /^node_modules\/(express|openid-client|qs|send|jose|execa|body-parser|@babel\/highlight|@babel\/code-frame)\//
      );
      verifyAllThatMatchAreInCategory(
        'snapshot',
        /^node_modules\/(@babel\/types|@babel\/traverse|@mongodb-js\/devtools-connect|mongodb)\/|^packages\/(?!(shell-api\/lib\/api-export\.js|cli-repl\/node_modules\/@mongodb-js\/mongodb-ts-autocomplete\/))/
      );
    });
  });
});
