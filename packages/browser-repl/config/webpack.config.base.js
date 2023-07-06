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
      //   async-rewriter2, @mongodb-js/compass-components, mongodb-log-writer, shell-api
      path: require.resolve('path-browserify'),
      // stream polyfill is required for following packages:
      //   mongodb-log-writer, @leafygreen-ui/emotion
      stream: require.resolve('stream-browserify'),
      // buffer polyfill is required for following packages:
      //   @leafygreen-ui/emotion
      buffer: require.resolve('buffer/'),
      // util polyfill is required by browser-repl itself
      util: require.resolve('util/'),
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
