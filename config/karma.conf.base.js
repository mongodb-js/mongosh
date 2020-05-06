process.env.CHROME_BIN = require('puppeteer').executablePath();
const os = require('os');

console.log('#######################################################');
console.log('PLATFORM', os.platform());

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
    browserConsoleLogOptions: {
      level: 'debug'
    },
    captureTimeout: 120000,
    logLevel: 'debug',
    browserSocketTimeout: 120000,
    karmaTypescriptConfig: {
      bundlerOptions: {
        constants: {
          "process.env": {
            'MONGOSH_STITCH_TEST_APP_ID': process.env.MONGOSH_STITCH_TEST_APP_ID,
            'MONGOSH_STITCH_TEST_SERVICE_NAME': process.env.MONGOSH_STITCH_TEST_SERVICE_NAME,
            'PLATFORM': os.platform()
          }
        }
      },
      compilerOptions: {
        allowJs: true,
      },
    },
    browsers: [ 'HeadlessChrome' ],
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
