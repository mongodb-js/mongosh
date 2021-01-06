const path = require('path');

/** @type import('webpack').Configuration */
const config = {
  target: 'node',

  devtool: false,

  output: {
    filename: '[name].js',
    libraryTarget: 'umd'
  },

  module: {
    rules: [{ test: /\.ts$/, loader: 'ts-loader', exclude: /node_modules/ }]
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },
};

module.exports = ['index', 'child-process-proxy', 'worker-runtime'].map(
  (entry) => ({
    entry: { [entry]: path.resolve(__dirname, 'src', `${entry}.ts`) },
    ...config
  })
);
