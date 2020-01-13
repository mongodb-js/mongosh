process.env.CHROME_BIN = require('puppeteer').executablePath();

const webpackConfigTest = require('./webpack.config.test');

module.exports = (config) => {
  config.set({
    plugins: [
      'karma-mocha',
      'karma-mocha-reporter',
      'karma-chrome-launcher',
      require('karma-webpack')
    ],
    webpack: webpackConfigTest,
    frameworks: [
      'mocha'
    ],
    files: [
      {
        pattern: '../src/**/*.spec.tsx'
      }
    ],
    preprocessors: {
      '../src/**/*.spec.tsx': [
        'webpack'
      ]
    },
    envPreprocessor: [
    ],
    reporters: [
      'mocha'
    ],
    browsers: [ 'ChromeHeadless' ],
    singleRun: true
  });
};
