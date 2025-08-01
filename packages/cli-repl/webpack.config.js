'use strict';
const fs = require('fs');
const Module = require('module');
const crypto = require('crypto');
const { merge } = require('webpack-merge');
const path = require('path');
const { WebpackDependenciesPlugin } = require('@mongodb-js/sbom-tools');
const {
  WebpackEnableReverseModuleLookupPlugin,
} = require('../../scripts/webpack-enable-reverse-module-lookup-plugin.js');

const baseWebpackConfig = require('../../config/webpack.base.config');

// Builtins that the driver and/or devtools-connect refer to but which
// cannot be snapshotted yet
// https://github.com/nodejs/node/pull/50943 addresses some of this,
// we can try to remove at least child_process once we are using a
// Node.js version that supports it.
const lazyNodeBuiltins = ['http', 'https', 'tls', 'child_process'];
const eagerNodeBuiltins = Module.builtinModules.filter(
  (m) => !lazyNodeBuiltins.includes(m)
);

const webpackDependenciesPlugin = new WebpackDependenciesPlugin({
  outputFilename: path.resolve(
    __dirname,
    '..',
    '..',
    '.sbom',
    'dependencies.json'
  ),
  includeExternalProductionDependencies: true,
});

const enableReverseModuleLookupPlugin =
  new WebpackEnableReverseModuleLookupPlugin({
    outputFilename: path.resolve(__dirname, 'dist', 'add-module-mapping.js'),
  });

/** @type import('webpack').Configuration */
const config = {
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'mongosh.js',
    library: {
      name: 'mongosh',
      // Doesn't really matter, we're not exposing anything here, but using `var`
      // integrates more easily with snapshot building than e.g. CommonJS
      type: 'var',
    },
  },
  plugins: [webpackDependenciesPlugin, enableReverseModuleLookupPlugin],
  entry: './lib/run.js',
  resolve: {
    alias: {
      // This is similar to https://github.com/babel/babel/issues/12442,
      // @babel/code-frame loads chalk loads supports-color which checks
      // for TTY color support during startup rather than at runtime
      '@babel/code-frame': makeLazyForwardModule('@babel/code-frame'),
      // express is used by oidc-plugin but is a) quite heavy and rarely used
      // b) uses http, which is not a supported module for snapshots at this point.
      express: makeLazyForwardModule('express'),
      'openid-client': makeLazyForwardModule('openid-client'),
      // some dependencies of @mongodb-js/devtools-proxy-support use WebAssembly,
      // `new Buffer()` or the built-in http module
      '@mongodb-js/devtools-proxy-support': makeLazyForwardModule(
        '@mongodb-js/devtools-proxy-support'
      ),
      ...Object.fromEntries(
        lazyNodeBuiltins.map((m) => [m, makeLazyForwardModule(m)])
      ),
      ...Object.fromEntries(
        lazyNodeBuiltins.map((m) => [`node:${m}`, makeLazyForwardModule(m)])
      ),
    },
  },

  externals: {
    electron: 'commonjs2 electron', // optional dep of the OIDC plugin
    ...Object.fromEntries(eagerNodeBuiltins.map((m) => [m, `commonjs2 ${m}`])),
    ...Object.fromEntries(
      Module.builtinModules.map((m) => [`node:${m}`, `commonjs2 ${m}`])
    ), // node: builtin specifiers need to be always declared as externals in webpack right now
    // mongodb-client-encryption fixup until NODE-6670 is done
    '../build/Release/mongocrypt.node':
      'commonjs2 ../build/Release/mongocrypt.node',
    '../build/Debug/mongocrypt.node':
      'commonjs2 ../build/Debug/mongocrypt.node',
  },

  externalsPresets: {
    node: false,
  },
};

module.exports = merge(baseWebpackConfig, config);

function moduleExportNeedsIdentityPreserved(pkg, key) {
  // This provides special-casing for the `allowInsecureRequests`
  // exports of the openid-client package. While the specific object
  // identity of exported functions is generally not important, and
  // wrappers can freely be applied, in this specific case the
  // openid-client package *does* check whether the `execute` array
  // passed to `.discover()` contains the `allowInsecureRequests`
  // function, and aligns behavior based on that (in addition to just
  // calling the function, as one would expect).
  return pkg === 'openid-client' && key === 'allowInsecureRequests';
}

// Helper to create a module that lazily loads the actual target package
// when it is being encountered. This is useful for snapshotting, where some
// packages either cannot be snapshotted or perform initialization during
// startup that should depend on runtime state.
function makeLazyForwardModule(pkg) {
  const S = JSON.stringify;
  const tmpdir = path.resolve(
    __dirname,
    '..',
    '..',
    'tmp',
    'lazy-webpack-modules'
  );
  fs.mkdirSync(tmpdir, { recursive: true });
  const filename = path.join(
    tmpdir,
    crypto.createHash('sha256').update(pkg).digest('hex').slice(0, 16) + '.js'
  );

  const realRequire = Module.isBuiltin(pkg)
    ? `__non_webpack_require__(${S(pkg)})`
    : `require(${S(require.resolve(pkg))})`;

  const moduleContents = require(pkg);
  let source = `'use strict';\nlet _cache, orig;\n`;
  source += `function _realModule() {\n_cache = ${realRequire}; orig = () => _cache; return _cache;\n}\n`;

  if (process.env.MONGOSH_DEBUG_WEBPACK_FORWARDING_MODULES) {
    source += `const _startupSnapshot = __non_webpack_require__("v8").startupSnapshot;
      function _throwModule() {\nthrow new Error('cannot load package "' + ${S(
        pkg
      )} + '" while building snapshot');\n}
      if (_startupSnapshot.isBuildingSnapshot()) {
        orig = _throwModule;
        _startupSnapshot.addDeserializeCallback(() => orig = _realModule);
      } else {
        orig = _realModule;
      }
    `;
  } else {
    source += `orig = _realModule;\n`;
  }

  if (typeof moduleContents === 'function') {
    source += `module.exports = function(...args) { return orig().apply(this, args); };\n`;
  } else {
    source += `module.exports = {};\n`;
  }
  const proxyProps = Object.getOwnPropertyNames(Reflect);
  source += `const { ${proxyProps
    .map((prop) => `${prop}: R_${prop}`)
    .join(', ')} } = Reflect;\n`;
  let i = 0;
  for (const key of Object.keys(moduleContents)) {
    if (
      typeof moduleContents[key] === 'function' &&
      !moduleExportNeedsIdentityPreserved(pkg, key)
    ) {
      source += `module.exports[${S(key)}] = new Proxy(function() {}, {
        ${proxyProps
          .map(
            (prop) => `${prop}(_target, ...args) {
          return R_${prop}(orig()[${S(key)}], ...args);
        }`
          )
          .join(',\n')}
      });\n`;
    } else {
      source += `let value_${i}, value_${i}_set = false;\n`;
      source += `Object.defineProperty(module.exports, ${S(key)}, {
        enumerable: true, configurable: true,
        get() {
          if (value_${i}_set) return value_${i};
          value_${i} = orig()[${S(key)}];
          value_${i}_set = true;
          return value_${i};
        }, set(v) {
          value_${i}_set = true;
          value_${i} = v;
        }
      })\n`;
      i++;
    }
  }

  fs.writeFileSync(filename, source);
  return filename;
}
