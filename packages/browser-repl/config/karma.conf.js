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
    webpackMiddleware: {
      logLevel: 'silent'
    },
    frameworks: [
      'mocha'
    ],
    files: [
      {
        pattern: '../src/**/*.spec.ts'
      },
      {
        pattern: '../src/**/*.spec.tsx'
      }
    ],
    preprocessors: {
      '../src/**/*.spec.ts': [
        'webpack'
      ],
      '../src/**/*.spec.tsx': [
        'webpack'
      ]
    },
    reporters: [
      'mocha'
    ],
    browsers: [ 'ChromeHeadless' ],
    singleRun: true,
    client: {
      mocha: {
        timeout: 15000
      }
    }
  });
};
