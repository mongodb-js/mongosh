import assert from 'assert';

const isBigEndian =
  new Int32Array(new Uint8Array([1, 0, 0, 0]).buffer)[0] !== 1;

// The pac-proxy-agent module uses a WebAssembly agent under the hood for
// safely evaluating JS. The interface for this doesn't properly account for
// little-endian vs. big-endian host platform distinctions.

// Official support for s390x may not be planned: https://github.com/justjake/quickjs-emscripten/issues/123

export let applyPacProxyS390XPatch: () => void;
if (isBigEndian) {
  applyPacProxyS390XPatch = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      ModuleMemory,
    } = require('@tootallnate/quickjs-emscripten/dist/memory');

    const { toPointerArray } = ModuleMemory.prototype;
    {
      // Consistency check: The version we are currently using is actually broken
      const HEAPU8 = new Uint8Array(4);
      toPointerArray.call(
        new ModuleMemory({
          _malloc: () => 0,
          HEAPU8,
        }),
        [{ value: 0x01020304 }]
      );
      assert.deepStrictEqual([...HEAPU8], [1, 2, 3, 4]); // should be 4, 3, 2, 1
    }

    ModuleMemory.prototype.toPointerArray = function (
      handleArray: { value: number }[]
    ) {
      return toPointerArray.call(
        this,
        handleArray.map(({ value }) => ({
          value:
            ((value & 0x000000ff) << 24) |
            ((value & 0x0000ff00) << 8) |
            ((value & 0x00ff0000) >> 8) |
            ((value & 0xff000000) >> 24),
        }))
      );
    };
  };
} else {
  applyPacProxyS390XPatch = () => {
    // no-op
  };
}
