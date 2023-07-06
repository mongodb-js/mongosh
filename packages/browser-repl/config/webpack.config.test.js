const webpackConfigBase = require('./webpack.config.base');

process.env.NODE_ENV = 'test';

module.exports = {
  ...webpackConfigBase,
  mode: 'development',
};
