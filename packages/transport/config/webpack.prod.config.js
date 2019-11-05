const merge = require('webpack-merge');
const path = require('path');
const PeerDepsExternalsPlugin = require('peer-deps-externals-webpack-plugin');

const baseWebpackConfig = require('./webpack.base.config');
const project = require('./project');

const config = merge.smart(baseWebpackConfig, {
  mode: 'production',
  devtool: false,
  output: {
    path: project.path.output,
    publicPath: './',
    filename: '[name].js'
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
});

const clientConfig = merge.smart(config, {
  target: 'web',
  entry: {
    index: path.resolve(project.path.src, 'browser.js')
  },
});

const serverConfig = merge.smart(config, {
  target: 'node',
  entry: {
    index: path.resolve(project.path.src, 'index.js')
  },
  output: {
    filename: '[name].node.js'
  }
});

module.exports = [ clientConfig, serverConfig ];
