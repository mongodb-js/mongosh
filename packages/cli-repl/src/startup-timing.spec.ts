import { TimingCategories, type TimingCategory } from '@mongosh/types';
import { summariseTimingData } from './startup-timing';
import { expect } from 'chai';

describe('startup timing', function () {
  describe('summariseTimingData', function () {
    it('should calculate durations of each category', function () {
      const timingData: [TimingCategory, string, number][] = [
        [TimingCategories.REPLInstantiation, '1 REPL', 50],
        [TimingCategories.Main, '1 Main', 50],
        [TimingCategories.REPLInstantiation, '2 REPL', 150],
        [TimingCategories.Main, '2 Main', 90],
      ];

      const summary = summariseTimingData(timingData);
      expect(summary).to.deep.equal([
        [TimingCategories.REPLInstantiation, 150],
        [TimingCategories.Main, 90],
      ]);
    });
  });
});
