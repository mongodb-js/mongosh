module.exports = (config) => {
  config.set({
    basePath: '',
    frameworks: [ 'mocha', 'karma-typescript' ],
    reporters: [ 'mocha' ],
    files: [ 'spec/*.spec.ts' ],
    port: 9876,
    colors: true,
    autoWatch: true,
    browsers: [ 'ChromeHeadlessNoSandbox' ],
    preprocessors: {
      '**/*.ts': [ 'karma-typescript' ]
    },
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: [ '--no-sandbox' ]
      }
    },
    singleRun: true
  });
};
