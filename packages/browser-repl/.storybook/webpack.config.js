const webpackBaseConfig = require('../config/webpack.config.base');

module.exports = ({ config }) => {
  config.module.rules = webpackBaseConfig.module.rules;
  config.resolve.extensions = webpackBaseConfig.resolve.extensions;
  return config;
};
