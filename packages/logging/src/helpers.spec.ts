import { expect } from 'chai';
import { toSnakeCase } from './helpers';

describe('logging helpers', function () {
  describe('toSnakeCase', function () {
    const useCases = [
      { input: 'MongoDB REPL', output: 'mongo_db_repl' },
      {
        input: 'Node.js REPL Instantiation',
        output: 'node_js_repl_instantiation',
      },
      { input: 'A', output: 'a' },
      {
        input: 'OneLongThingInPascalCase',
        output: 'one_long_thing_in_pascal_case',
      },
      { input: 'Removes .Dots in Node.js', output: 'removes_dots_in_node_js' },
    ];

    for (const { input, output } of useCases) {
      it(`should convert ${input} to ${output}`, function () {
        expect(toSnakeCase(input)).to.equal(output);
      });
    }
  });
});
