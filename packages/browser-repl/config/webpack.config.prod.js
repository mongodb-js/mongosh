const path = require('path');
const webpackConfigBase = require('./webpack.config.base');

const libraryName = 'mongosh-browser-repl';

const excludeFromBundle = {
  'react': 'react',
  'react-dom': 'react-dom',
  'prop-types': 'prop-types'
};

module.exports = {
  ...webpackConfigBase,
  mode: 'production',
  devtool: 'source-map',
  resolve: {
    ...webpackConfigBase.resolve,
    alias: Object.keys(excludeFromBundle).reduce((aliases, dependency) => ({
      ...aliases,
      [dependency]: path.resolve(__dirname, 'node_modules', dependency)
    }), {})
  },
  entry: path.resolve(__dirname, '..', 'src', 'index.tsx'),
  output: {
    filename: `${libraryName}.js`,
    library: libraryName,
    libraryTarget: 'umd',
    path: path.resolve(__dirname, '..', 'lib'),
    umdNamedDefine: true
  },
  externals: {...excludeFromBundle, fs: 'none'}
};
