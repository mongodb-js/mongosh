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
    library: {
      name: 'mongosh',
      // Doesn't really matter, we're not exposing anything here, but using `var`
      // integrates more easily with snapshot building than e.g. CommonJS
      type: 'var',
    },
  },
  plugins: [webpackDependenciesPlugin],
  entry: './lib/run.js',
};

module.exports = merge(baseWebpackConfig, config);
