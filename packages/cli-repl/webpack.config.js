'use strict';
const { merge } = require('webpack-merge');
const path = require('path');

const baseWebpackConfig = require('../../config/webpack.base.config');

/** @type import('webpack').Configuration */
const config = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'mongosh.js',
    libraryTarget: 'commonjs2'
  },
  entry: './lib/run.js',
};

module.exports = merge(baseWebpackConfig, config);
