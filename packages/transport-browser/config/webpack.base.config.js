const path = require('path');
const project = require('./project');

module.exports = {
  output: {
    path: project.path.output,
    publicPath: './',
    filename: 'index.js'
  },
  resolve: {
    modules: ['node_modules'],
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: [{
          loader: 'babel-loader',
          query: {
            cacheDirectory: true
          }
        }],
        exclude: /(node_modules)/
      }
    ]
  }
};
