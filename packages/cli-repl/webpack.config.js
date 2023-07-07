'use strict';
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
    libraryTarget: 'commonjs2',
  },
  plugins: [webpackDependenciesPlugin],
  entry: './lib/run.js',
};

module.exports = merge(baseWebpackConfig, config);
