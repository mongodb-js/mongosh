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
      'src/**/*.ts': [ 'karma-typescript' ],
    },
    reporters: [
      'mocha',
      'karma-typescript'
    ],
    karmaTypescriptConfig: {
      compilerOptions: {
        allowJs: true,
      },
    },
    browsers: [ 'ChromeHeadless' ],
    singleRun: true
  });
};

module.exports = configure;
