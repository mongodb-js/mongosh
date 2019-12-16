module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: [ 'mocha' ],
    reporters: [ 'mocha' ],
    files: [
      { pattern: 'spec/**/*.spec.ts', watched: false }
    ],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: [ 'ChromeHeadlessNoSandbox' ],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [ '--no-sandbox' ]
      }
    },
    singleRun: true
  });
};
