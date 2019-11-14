const merge = require('webpack-merge');
const path = require('path');
const PeerDepsExternalsPlugin = require('peer-deps-externals-webpack-plugin');

const baseWebpackConfig = require('./webpack.base.config');
const project = require('./project');

const config = {
  mode: 'production',
  devtool: false,
  target: 'node',
  entry: {
    index: path.resolve(project.path.src, 'index.js')
  },
  plugins: [
    new PeerDepsExternalsPlugin()
  ],
  stats: {
    colors: true,
    children: false,
    chunks: false,
    modules: false
  }
};

module.exports = merge.smart(baseWebpackConfig, config);
