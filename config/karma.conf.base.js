const os = require('os');
const setupTestBrowser = require('./setup-test-browser');
const browser = setupTestBrowser();

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
            'STITCH_TEST_APP_ID': process.env.STITCH_TEST_APP_ID,
            'STITCH_TEST_SERVICE_NAME': process.env.STITCH_TEST_SERVICE_NAME,
            'PLATFORM': os.platform()
          }
        }
      },
      compilerOptions: {
        allowJs: true,
      },
    },
    browsers: [ browser ],
    customLaunchers: {
      HeadlessChrome: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox']
      }
    },
    singleRun: true,
    client: {
      mocha: {
        timeout: 15000
      }
    }
  });
};

module.exports = configure;
