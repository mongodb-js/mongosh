const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

/** @type import('webpack').Configuration */
const config = {
  target: 'node',

  devtool: false,

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'umd'
  },

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

  resolveLoader: {
    modules: ['node_modules', path.resolve(__dirname, 'loaders')]
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // Not keeping classnames breaks shell-api during minification
          keep_classnames: true
        }
      })
    ]
  }
};

module.exports = ['index', 'child-process-proxy', 'worker-runtime'].map(
  (entry) => ({
    entry: { [entry]: path.resolve(__dirname, 'src', `${entry}.ts`) },
    ...config
  })
);
