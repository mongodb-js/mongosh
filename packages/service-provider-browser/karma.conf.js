const baseConfig = require('../../config/karma.conf.base');

/**
 * Configure Karma.
 *
 * @param {Config} config - The config.
 */
const configure = (config) => {
  baseConfig(config);
};

module.exports = configure;
