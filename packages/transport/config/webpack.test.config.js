const nodeExternals = require('webpack-node-externals');
const merge = require('webpack-merge');

const baseWebpackConfig = require('./webpack.base.config');
const project = require('./project');

const config = {
  mode: 'none',
  target: 'node',
  devtool: 'eval-source-map',
  externals: [ nodeExternals() ],
  stats: {
    warnings: false
  },
  module: {
    rules: [
      {
        test: /\.(js)/,
        enforce: 'post', // Enforce as a post step so babel can do its compilation prior to instrumenting code
        exclude: [
          /node_modules/,
          /constants/,
          /.*?(?=\.spec).*?\.js/
        ],
        include: project.path.src,
        use: {
          loader: 'istanbul-instrumenter-loader',
          options: {
            esModules: true
          }
        }
      }
    ]
  }
};

module.exports = merge.smart(baseWebpackConfig, config);
