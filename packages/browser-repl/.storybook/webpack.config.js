const webpackBaseConfig = require('../webpack.config');

module.exports = ({ config }) => {
  config.module.rules = webpackBaseConfig.module.rules;
  config.resolve.extensions = webpackBaseConfig.resolve.extensions;
  return config;
}