import { expect } from 'chai';
import {
  collectionNameFromFile,
  parseCsv,
  parseCsvRows,
  parseNdjson,
  parseJson,
} from './parse';

describe('embedded smongo parse helpers', function () {
  describe('collectionNameFromFile', function () {
    it('derives the collection name from the file stem', function () {
      expect(collectionNameFromFile('/path/to/data.csv')).to.equal('data');
      expect(collectionNameFromFile('./orders.json')).to.equal('orders');
      expect(collectionNameFromFile('my.data.ndjson')).to.equal('my.data');
    });

    it('sanitizes invalid collection name characters', function () {
      expect(collectionNameFromFile('a$b.csv')).to.equal('a_b');
      expect(collectionNameFromFile('system.profile.csv')).to.equal(
        'sys_profile'
      );
    });
  });

  describe('parseCsv', function () {
    it('parses a header row and rows, inferring types', function () {
      const docs = parseCsv('name,age,active\nAlice,34,true\nBob,41,false\n');
      expect(docs).to.deep.equal([
        { name: 'Alice', age: 34, active: true },
        { name: 'Bob', age: 41, active: false },
      ]);
    });

    it('keeps non-numeric values as strings and nulls for empty cells', function () {
      const docs = parseCsv('a,b\n1,x\n,y\n');
      expect(docs).to.deep.equal([
        { a: 1, b: 'x' },
        { a: null, b: 'y' },
      ]);
    });

    it('handles quoted fields with embedded commas and newlines', function () {
      const rows = parseCsvRows('a,b\n"hello, world","line1\nline2"\n');
      expect(rows).to.deep.equal([
        ['a', 'b'],
        ['hello, world', 'line1\nline2'],
      ]);
    });

    it('returns an empty array for empty input', function () {
      expect(parseCsv('')).to.deep.equal([]);
    });
  });

  describe('parseNdjson', function () {
    it('parses one object per line', function () {
      expect(parseNdjson('{"a":1}\n{"a":2,"b":true}\n')).to.deep.equal([
        { a: 1 },
        { a: 2, b: true },
      ]);
    });

    it('ignores blank lines', function () {
      expect(parseNdjson('{"a":1}\n\n{"a":2}\n')).to.deep.equal([
        { a: 1 },
        { a: 2 },
      ]);
    });

    it('throws on a non-object line', function () {
      expect(() => parseNdjson('{"a":1}\n[1,2]\n')).to.throw();
    });
  });

  describe('parseJson', function () {
    it('parses an array of objects', function () {
      expect(parseJson('[{"a":1},{"a":2}]')).to.deep.equal([
        { a: 1 },
        { a: 2 },
      ]);
    });

    it('wraps a single object in an array', function () {
      expect(parseJson('{"a":1}')).to.deep.equal([{ a: 1 }]);
    });

    it('throws on a non-object value', function () {
      expect(() => parseJson('42')).to.throw();
    });
  });
});
