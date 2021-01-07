const path = require('path');
const { getOptions } = require('loader-utils');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');

function inlineEntryLoader() {
  /**
   * Main loader lifecycle does nothing, everything happens in `pitch` step
   * @see {@link https://webpack.js.org/api/loaders/#pitching-loader}
   */
}

/**
 * Pitch step will split an import into its own entry, compile it into a single
 * bundle and returns the stringified source
 *
 * @param {string} request
 */
inlineEntryLoader.pitch = function pitch(request) {
  const loaderName = `inline-entry-loader ${request}`;

  /** @type {import('webpack').loader.LoaderContext} */
  const that = this;
  /** @type {import('webpack').compilation.Compilation} */
  const parentCompilation = that._compilation;

  that.cacheable(false);

  const { esModule = true, emit = false, ...outputOptions } = getOptions(that);

  const cb = that.async();

  const inlineEntryOutputOptions = {
    ...outputOptions,
    filename: '[contenthash].inline-entry-loader.js'
  };

  /**
   * @type {import('webpack').Compiler}
   * @see {@link https://webpack.js.org/api/compilation-object/#createchildcompiler}
   */
  const inlineEntryCompiler = parentCompilation.createChildCompiler(
    loaderName,
    inlineEntryOutputOptions
  );

  inlineEntryCompiler.options.optimization = {
    ...inlineEntryCompiler.options.optimization,
    ...parentCompilation.compiler.options.optimization
  };

  if (
    inlineEntryCompiler.options &&
    inlineEntryCompiler.options.optimization &&
    inlineEntryCompiler.options.optimization.splitChunks
  ) {
    inlineEntryCompiler.options.optimization.splitChunks = false;
  }

  if (this.target !== 'webworker' && this.target !== 'web') {
    new NodeTargetPlugin().apply(inlineEntryCompiler);
  }

  const resourceName = path.parse(that.resourcePath).name;

  new SingleEntryPlugin(that.context, `!!${request}`, resourceName).apply(
    inlineEntryCompiler
  );

  let outputFilename;

  parentCompilation.compiler.hooks.emit.tapAsync(
    loaderName,
    (compilation, callback) => {
      if (!emit) {
        delete compilation.assets[outputFilename];
      }
      callback();
    }
  );

  /**
   *
   * @param {Error} err
   * @param {import('webpack').compilation.Chunk} entries
   * @param {import('webpack').compilation.Compilation} compilation
   */
  const handleChildCompilation = (err, entries, compilation) => {
    if (err) {
      return cb(err);
    }

    /** @type {import('webpack').compilation.Chunk} */
    const chunk = entries[0];

    if (chunk) {
      outputFilename = chunk.files[0];

      /** @type {import('webpack-sources').RawSource} */
      const src = compilation.assets[outputFilename];
      const contents = JSON.stringify(src.source());

      return cb(
        null,
        `${esModule ? 'export default' : 'module.exports ='} ${contents}`
      );
    }

    return cb(
      new Error(
        'Something went wrong when trying to inline chunk: no entries returned by child compilation'
      )
    );
  };

  inlineEntryCompiler.runAsChild(handleChildCompilation);
};

module.exports = inlineEntryLoader;
