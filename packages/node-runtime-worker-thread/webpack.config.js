'use strict';
const { merge } = require('webpack-merge');
const path = require('path');

const { WebpackDependenciesPlugin } = require('@mongodb-js/sbom-tools');
const baseWebpackConfig = require('../../config/webpack.base.config');

const webpackDependenciesPlugin = new WebpackDependenciesPlugin({
  outputFilename: path.resolve(__dirname, '.sbom', 'dependencies.json'),
  includeExternalProductionDependencies: true,
});

/** @type import('webpack').Configuration */
const config = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'umd',
  },
  plugins: [webpackDependenciesPlugin],
  externals: {
    'mongodb-client-encryption': 'commonjs2 mongodb-client-encryption',
    'mongodb-client-encryption/package.json':
      'commonjs2 mongodb-client-encryption/package.json',
    kerberos: 'commonjs2 kerberos',
    'kerberos/package.json': 'commonjs2 kerberos/package.json',
    snappy: 'commonjs2 snappy',
    interruptor: 'commonjs2 interruptor',
    'os-dns-native': 'commonjs2 os-dns-native',
    'system-ca': 'commonjs2 system-ca',
    // TODO(MONGOSH-3055): This is a temporary workaround.
    // @aws-sdk/client-sts is an optional peer dependency of @aws-sdk/credential-providers
    '@aws-sdk/client-sts': 'commonjs2 @aws-sdk/client-sts',
  },
};

module.exports = ['index', 'worker-runtime'].map((entry) => ({
  entry: { [entry]: path.resolve(__dirname, 'src', `${entry}.ts`) },
  ...merge(baseWebpackConfig, config),
}));
