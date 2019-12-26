process.env.CHROME_BIN = require('puppeteer').executablePath();

/**
 * Configure Karma.
 *
 * @param {Config} config - The config.
 */
const configure = (config) => {
  config.set({
    frameworks: [
      'karma-typescript',
      'mocha'
    ],
    files: [
      {
        pattern: 'src/**/*.spec.ts'
      }
    ],
    preprocessors: {
      'src/**/*.ts': [ 'env', 'karma-typescript' ],
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
    singleRun: true
  });
};

module.exports = configure;
