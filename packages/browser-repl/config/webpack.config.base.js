module.exports = {
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.less']
  },
  module: {
    rules: [
      {
        test: /^(?!.*\.spec\.js(x?)$).*\.js(x?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /^(?!.*\.spec\.ts(x?)$).*\.ts(x?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader'
        }
      },
      {
        test: /\.css$/,
        use: [
          { loader: 'style-loader' },
          { loader: 'css-loader' }
        ]
      },
      // For styles that have to be global (see https://github.com/css-modules/css-modules/pull/65)
      {
        test: /\.less$/,
        include: [/\.global/, /bootstrap/],
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              modules: false
            }
          },
          {
            loader: 'less-loader',
          }
        ]
      },
      // For CSS-Modules locally scoped styles
      {
        test: /\.less$/,
        exclude: [/\.global/, /bootstrap/, /node_modules/],
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: 'mongosh-[name]-[local]__[hash:base64:5]'
              },
              importLoaders: 1,
            }
          },
          {
            loader: 'less-loader'
          }
        ]
      }
    ]
  }
};
