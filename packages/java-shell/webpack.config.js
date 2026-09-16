'use strict';
const { merge } = require('webpack-merge');
const path = require('path');

const baseWebpackConfig = require('../../config/webpack.base.config');

/** @type import('webpack').Configuration */
const config = {
  output: {
    path: path.resolve(__dirname, 'src', 'main', 'resources', 'js'),
    filename: 'all-standalone.js',
    libraryTarget: 'var',
    library: '_shell_api'
  },
  resolve: {
    alias: {
      assert: require.resolve('assert/'),
      crypto: require.resolve('crypto-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      fs: false,
      module: false,
      tr46: require.resolve('tr46')
    },
    fallback: {
      // required by readable-stream, ripemd160, safe-buffer, safer-buffer
      buffer: require.resolve('buffer/'),
      // required by readable-stream
      events: require.resolve('events/'),
      // required by readable-stream, cipher-base
      string_decoder: require.resolve('string_decoder/'),
      // required by shell-api, shell-bson, readable-stream
      util: require.resolve('util/'),
      // required by tr46
      punycode: require.resolve('punycode/'),
      // shell-evaluator requires v8 inside a try/catch to detect Node.js, so
      // there is nothing to polyfill for a browser bundle.
      v8: false
    },
  },
  entry: './src/main/js/all.js',
  target: 'web',
};

module.exports = merge(baseWebpackConfig, config);
