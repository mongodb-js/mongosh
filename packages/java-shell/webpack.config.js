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
      assert: require.resolve('assert'),
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
  },
  entry: './src/main/js/all.js',
  target: 'web',
};

module.exports = merge(baseWebpackConfig, config);
