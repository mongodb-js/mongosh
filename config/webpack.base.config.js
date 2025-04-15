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
      // Optional native-addon dependencies of ssh2
      'cpu-features': false,
      './crypto/build/Release/sshcrypto.node': false,
    }
  },

  externals: {
    'node:crypto': 'commonjs2 crypto',
    electron: 'commonjs2 electron', // Optional dep of the OIDC plugin
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
