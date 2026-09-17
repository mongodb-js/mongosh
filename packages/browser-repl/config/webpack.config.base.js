const webpack = require('webpack');

module.exports = {
  target: 'web',
  stats: 'errors-only',
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.less'],
    fallback: {
      // node specific and don't require a polyfill
      zlib: false,
      v8: false,
      fs: false,
      crypto: false,
      module: false,
      // node specific and require a polyfill
      // path polyfill is required for following packages:
      //   async-rewriter2, @mongodb-js/compass-components, mongodb-log-writer,
      //   shell-api
      path: require.resolve('path-browserify'),
      // stream polyfill is required for following packages:
      //   mongodb-log-writer, @leafygreen-ui/emotion
      stream: require.resolve('stream-browserify'),
      // buffer polyfill is required for following packages:
      //   @leafygreen-ui/emotion
      buffer: require.resolve('buffer/'),
      // util polyfill is required by browser-repl itself
      util: require.resolve('util/'),
      // events is required by: readable-stream, stream-browserify, node-cache,
      //   shell-api, browser-runtime-core
      events: require.resolve('events/'),
      // assert is required by: @babel/helper-module-imports,
      //   @babel/helper-module-transforms
      assert: require.resolve('assert/'),
      // process is required by: semver, @mongodb-js/compass-components
      process: require.resolve('process/'),
      // string_decoder is required by: readable-stream
      string_decoder: require.resolve('string_decoder/'),
      // punycode is required by: tr46
      punycode: require.resolve('punycode/'),
      // Requested by typescript.js behind guarded require() calls that never
      // run in a browser, so there is nothing to polyfill.
      os: false,
      inspector: false,
      perf_hooks: false,
      // compass specific
      electron: false,
      '@electron/remote': false,
      'hadron-ipc': false,
      'compass-preferences-model': false,
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: [/src/, /node_modules/],
        use: {
          loader: require.resolve('babel-loader'),
          options: {
            presets: [
              require.resolve('@babel/preset-react'),
              require.resolve('@babel/preset-typescript'),
            ],
            plugins: [
              require.resolve('@babel/plugin-proposal-class-properties'),
            ],
            sourceType: 'unambiguous',
            compact: false,
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  externals: { 'node:crypto': 'commonjs crypto' },
};
