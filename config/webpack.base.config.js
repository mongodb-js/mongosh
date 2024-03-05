'use strict';
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
    }
  },

  externals: {
    "node:crypto": "commonjs2 crypto",
    // node-fetch https://github.com/node-fetch/node-fetch/blob/8b3320d2a7c07bce4afc6b2bf6c3bbddda85b01f/src/index.js#L9
    "node:buffer": "commonjs2 buffer",
    "node:http": "commonjs2 http",
    "node:https": "commonjs2 https",
    "node:stream": "commonjs2 stream",
    "node:zlib": "commonjs2 zlib", 
    "node:url": "commonjs2 url",
    "node:util": "commonjs2 util",
    "node:events": "commonjs2 events",
    "node:net": "commonjs2 net",
    // https://github.com/node-fetch/node-fetch/blob/8b3320d2a7c07bce4afc6b2bf6c3bbddda85b01f/test/main.js#L2
    "node:dns": "commonjs2 dns",
    "node:fs": "commonjs2 fs",
    "node:path": "commonjs2 path",
    "node:vm": "commonjs2 vm",
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
