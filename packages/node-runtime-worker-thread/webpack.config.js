'use strict';
const { merge } = require('webpack-merge');
const path = require('path');

const baseWebpackConfig = require('../../config/webpack.base.config');

/** @type import('webpack').Configuration */
const config = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
  },

  externals: {
    'mongodb-client-encryption': 'commonjs2 mongodb-client-encryption',
    kerberos: 'commonjs2 kerberos',
    snappy: 'commonjs2 snappy',
    interruptor: 'commonjs2 interruptor',
    'os-dns-native': 'commonjs2 os-dns-native',
    'system-ca': 'commonjs2 system-ca',
  },
};

module.exports = ['index', 'worker-runtime'].map((entry) => ({
  entry: { [entry]: path.resolve(__dirname, 'src', `${entry}.ts`) },
  ...merge(baseWebpackConfig, config),
}));
