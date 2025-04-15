'use strict';
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');

class WebpackEnableReverseModuleLookupPlugin {
  outputFilename;
  constructor({ outputFilename }) { this.outputFilename = outputFilename; }

  apply(compiler) {
    compiler.hooks.emit.tapPromise('EnableReverseModuleLookupPlugin', async(compilation) => {
      const map = Object.create(null);
      for (const module of compilation.modules) {
        const id = compilation.chunkGraph.getModuleId(module);
        if (id && module.resource) {
          map[id] = module.resource;
        }
      }
      const data = (await promisify(zlib.brotliCompress)(JSON.stringify(map))).toString('base64');
      await fs.promises.mkdir(path.dirname(this.outputFilename), { recursive: true });
      await fs.promises.writeFile(this.outputFilename, `function __webpack_reverse_module_lookup__() {
        return __webpack_reverse_module_lookup__.data ??= JSON.parse(
          require("zlib").brotliDecompressSync(Buffer.from(${JSON.stringify(data)}, 'base64')));
      }`);
    })
  }
}

module.exports = { WebpackEnableReverseModuleLookupPlugin };
