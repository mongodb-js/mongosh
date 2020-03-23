process.env.CHROME_BIN = require('puppeteer').executablePath();

/**
 * Configure Karma.
 *
 * @param {Config} config - The config.
 */
const configure = (config) => {
  config.set({
    externals: {
      fs: 'none'
    },
    frameworks: [
      'mocha',
      'karma-typescript'
    ],
    files: [
      { pattern: 'src/**/*.ts' }
    ],
    preprocessors: {
      'src/**/*.ts': [ 'karma-typescript' ],
    },
    envPreprocessor: [
    ],
    reporters: [
      'mocha',
      'karma-typescript'
    ],
    karmaTypescriptConfig: {
      bundlerOptions: {
        constants: {
          "process.env": {
            'MONGOSH_STITCH_TEST_APP_ID': process.env.MONGOSH_STITCH_TEST_APP_ID,
            'MONGOSH_STITCH_TEST_SERVICE_NAME': process.env.MONGOSH_STITCH_TEST_SERVICE_NAME
          }
        }
      },
      compilerOptions: {
        allowJs: true,
      },
    },
    browsers: [ 'ChromeHeadless' ],
    singleRun: true,
    client: {
      mocha: {
        timeout: 15000
      }
    }
  });
};

module.exports = configure;
