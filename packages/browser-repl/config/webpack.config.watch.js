const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const webpackConfigBase = require('./webpack.config.base');

webpackConfigBase.module.rules[0].use.options.plugins = [
  ...webpackConfigBase.module.rules[0].use.options.plugins,
  require.resolve('react-refresh/babel'),
];

module.exports = {
  ...webpackConfigBase,
  mode: 'development',
  devServer: {
    static: false,
    host: 'localhost',
    hot: true,
  },
  entry: {
    sandbox: path.resolve(__dirname, '..', 'src', 'sandbox.tsx'),
  },
  plugins: [
    ...(webpackConfigBase.plugins ?? []),
    new HtmlWebpackPlugin(),
    new ReactRefreshWebpackPlugin(),
  ],
};
