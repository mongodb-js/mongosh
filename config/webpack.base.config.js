'use strict';
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
    extensions: ['.ts', '.js']
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
