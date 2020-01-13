const path = require('path');
const webpackConfigBase = require('./webpack.config.base');

module.exports = {
  ...webpackConfigBase,
  devtool: 'source-map',
  resolve: {
    ...webpackConfigBase.resolve,
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom')
    }
  },
  output: {
    filename: 'mongosh-browser-repl.js',
    library: 'mongosh-browser-repl',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'lib'),
    umdNamedDefine: true
  },
  externals: {
    // Don't bundle react or react-dom
    react: {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'React',
      root: 'React'
    },
    'react-dom': {
      commonjs: 'react-dom',
      commonjs2: 'react-dom',
      amd: 'ReactDOM',
      root: 'ReactDOM'
    }
  }
};
