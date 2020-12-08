const loaderUtils = require('loader-utils');

const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

function loader() {}

loader.pitch = function pitch(request) {
  this.cacheable(false);

  const options = loaderUtils.getOptions(this) || {};

  const cb = this.async();

  const filename = loaderUtils.interpolateName(
    this,
    `${options.name || '[hash]'}.inline.js`,
    {
      context: options.context || this.rootContext || this.options.context,
      regExp: options.regExp,
    }
  );

  const inlineEntry = {};

  inlineEntry.options = {
    filename,
    chunkFilename: `[id].${filename}`,
    namedChunkFilename: null,
  };

  inlineEntry.compiler = this._compilation.createChildCompiler(
    'inline',
    inlineEntry.options
  );

  if (this.target !== 'webworker' && this.target !== 'web') {
    new NodeTargetPlugin().apply(inlineEntry.compiler);
  }

  new SingleEntryPlugin(this.context, request, 'main').apply(
    inlineEntry.compiler
  );

  inlineEntry.compiler.runAsChild((err, entries, compilation) => {
    if (err) return cb(err);

    if (entries[0]) {
      inlineEntry.file = entries[0].files[0];

      const contents = compilation.assets[inlineEntry.file].source();

      inlineEntry.url = JSON.stringify(contents);

      return cb(null, `module.exports = ${inlineEntry.url};`);
    }

    return cb(null, null);
  });
};

module.exports = loader;
