'use strict';
const fs = require('fs');
const crypto = require('crypto');
const { merge } = require('webpack-merge');
const path = require('path');
const { WebpackDependenciesPlugin } = require('@mongodb-js/sbom-tools');

const baseWebpackConfig = require('../../config/webpack.base.config');

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

/** @type import('webpack').Configuration */
const config = {
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
  plugins: [webpackDependenciesPlugin],
  entry: './lib/run.js',
  resolve: {
    alias: {
      // This is similar to https://github.com/babel/babel/issues/12442,
      // @babel/code-frame loads chalk loads supports-color which checks
      // for TTY color support during startup rather than at runtime
      '@babel/code-frame': makeLazyForwardModule('@babel/code-frame'),
    },
  },
};

module.exports = merge(baseWebpackConfig, config);

// Helper to create a module that lazily loads the actual target package
// when it is being encountered. This is useful for snapshotting, where some
// packages either cannot be snapshotted or perform initialization during
// startup that should depend on runtime state.
function makeLazyForwardModule(pkg) {
  const S = JSON.stringify;
  const tmpdir = path.resolve(__dirname, '..', 'tmp', 'lazy-webpack-modules');
  fs.mkdirSync(tmpdir, { recursive: true });
  const filename = path.join(
    tmpdir,
    crypto.createHash('sha256').update(pkg).digest('hex').slice(0, 16) + '.js'
  );

  const moduleContents = require(pkg);
  let source = `'use strict';\nlet _cache;\n`;
  source += `function orig() {\n_cache = require(${S(
    require.resolve(pkg)
  )}); orig = () => _cache; return _cache;\n}\n`;
  if (typeof moduleContents === 'function') {
    source += `module.exports = function(...args) { return orig().apply(this, args); };\n`;
  } else {
    source += `module.exports = {};\n`;
  }
  let i = 0;
  for (const key of Object.keys(moduleContents)) {
    if (typeof moduleContents[key] === 'function') {
      source += `module.exports[${S(
        key
      )}] = function(...args) { return orig()[${S(
        key
      )}].apply(this, args); };\n`;
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
