'use strict';
const TerserPlugin = require('terser-webpack-plugin');

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
    extensions: ['.ts', '.js']
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
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
};
