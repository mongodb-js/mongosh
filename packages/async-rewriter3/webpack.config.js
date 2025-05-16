'use strict';
const { merge } = require('webpack-merge');
const path = require('path');
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

const baseWebpackConfig = require('../../config/webpack.base.config');

/** @type import('webpack').Configuration */
const config = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
    },
  },
  plugins: [new WasmPackPlugin({
    crateDirectory: __dirname
  })],
  entry: './lib/index.js',
};

module.exports = merge(baseWebpackConfig, config);
