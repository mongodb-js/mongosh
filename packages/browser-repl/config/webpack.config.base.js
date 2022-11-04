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
      // node specific and require a polyfill
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      util: require.resolve('util/'),
      // compass specific
      electron: false,
      '@electron/remote': false,
      'hadron-ipc': false,
      'compass-preferences-model': false
    }
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
              require.resolve('@babel/preset-typescript')
            ],
            plugins: [
              require.resolve('@babel/plugin-proposal-class-properties')
            ],
            sourceType: 'unambiguous',
            compact: false
          }
        }
      },
      {
        test: /\.css$/,
        use: [
          { loader: require.resolve('style-loader') },
          { loader: require.resolve('css-loader') }
        ]
      },
      // For styles that have to be global (see https://github.com/css-modules/css-modules/pull/65)
      {
        test: /\.less$/,
        include: [/\.global/, /bootstrap/],
        use: [
          {
            loader: require.resolve('style-loader')
          },
          {
            loader: require.resolve('css-loader'),
            options: {
              modules: false
            }
          },
          {
            loader: require.resolve('less-loader')
          }
        ]
      },
      // For CSS-Modules locally scoped styles
      {
        test: /\.less$/,
        exclude: [/\.global/, /bootstrap/, /node_modules/],
        use: [
          { loader: require.resolve('style-loader') },
          {
            loader: require.resolve('css-loader'),
            options: {
              modules: {
                localIdentName: 'mongosh-[name]-[local]__[hash:base64:5]'
              },
              importLoaders: 1
            }
          },
          {
            loader: require.resolve('less-loader')
          }
        ]
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process',
      Buffer: ['buffer', 'Buffer']
    })
  ]
};
