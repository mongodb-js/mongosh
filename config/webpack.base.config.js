'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

/** @type import('webpack').Configuration */
module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [{ loader: 'ts-loader' }],
        exclude: [/node_modules/]
      }
    ]
  },

  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      // Stub out particularly large dependencies that are unnecessary and/or
      // only provide features that Node.js also provides out of the box.
      browserslist: path.resolve(__dirname, '..', 'scripts', 'dummy-browserslist.js'),
      tr46: path.resolve(__dirname, '..', 'scripts', 'tr46-stub.js'),
      // This is similar to https://github.com/babel/babel/issues/12442,
      // @babel/code-frame loads chalk loads supports-color which checks
      // for TTY color support during startup rather than at runtime
      '@babel/code-frame': makeLazyForwardModule('@babel/code-frame'),
    }
  },

  externals: {
    "node:crypto": "commonjs2 crypto",
    electron: "commonjs2 electron" // optional dep of the OIDC plugin
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Using ASCII-only output means a slightly larger bundle file,
          // but a significantly smaller executable, since V8 only allows
          // storing strings as either ISO-8859-1 or UTF-16 and UTF-16 takes
          // up twice the space that ISO-8859-1 strings do.
          output: { ascii_only: true },
          // Not keeping classnames breaks shell-api during minification
          keep_classnames: true,
          compress: {
            // The 'bindings' package relies on `error.stack;` having side effects.
            pure_getters: false
          }
        }
      })
    ]
  },

  output: {
    strictModuleErrorHandling: true,
    strictModuleExceptionHandling: true,
  },

  node: false,
  target: 'node',

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false
    })
  ]
};

// Helper to create a module that lazily loads the actual target package
// when it is being encountered. This is useful for snapshotting, where some
// packages either cannot be snapshotted or perform initialization during
// startup that should depend on runtime state.
function makeLazyForwardModule(pkg) {
  const S = JSON.stringify;
  const tmpdir = path.resolve(__dirname, '..', 'tmp', 'lazy-webpack-modules');
  fs.mkdirSync(tmpdir, { recursive: true });
  const filename = path.join(tmpdir, crypto.createHash('sha256').update(pkg).digest('hex').slice(0, 16) + '.js');

  const moduleContents = require(pkg);
  let source = `'use strict';\nlet _cache;\n`;
  source += `function orig() {\n_cache = require(${S(require.resolve(pkg))}); orig = () => _cache; return _cache;\n}\n`;
  if (typeof moduleContents === 'function') {
    source += `module.exports = function(...args) { return orig().apply(this, args); };\n`;
  } else {
    source += `module.exports = {};\n`;
  }
  let i = 0;
  for (const key of Object.keys(moduleContents)) {
    if (typeof moduleContents[key] === 'function') {
      source += `module.exports[${S(key)}] = function(...args) { return orig()[${S(key)}].apply(this, args); };\n`;
    } else {
      source += `let value_${i}, value_${i}_set = false;\n`
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